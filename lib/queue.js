// lib/queue.js
const { Queue } = require('bullmq');
const Redis = require('ioredis');
const { createSmartBillInvoice } = require('./smartbill');
const prisma = require('./prisma');

// Set up Redis connection
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Create a queue for invoice processing
const invoiceQueue = new Queue('invoice-processing', {
  connection: redisClient,
  defaultJobOptions: {
    // Configure retries with exponential backoff
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60 * 1000, // Start with 1 minute delay
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Queue an invoice creation job
async function queueInvoiceJob({ paymentId, connectionId }) {
  await invoiceQueue.add('create-invoice', {
    paymentId,
    connectionId,
    timestamp: Date.now(),
  });

  // Log the job in audit log
  await prisma.auditLog.create({
    data: {
      eventType: 'invoice.queued',
      payload: {
        paymentId,
        connectionId,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return true;
}

// Manually retry a failed invoice
async function retryInvoiceCreation(paymentId) {
  // Check if there's already an invoice link
  const existingInvoice = await prisma.invoiceLink.findUnique({
    where: { paymentId },
  });

  if (existingInvoice && existingInvoice.status === 'COMPLETED') {
    return {
      success: false,
      message: 'Invoice already exists',
      invoiceId: existingInvoice.smartbillId,
    };
  }

  // Get the payment to validate it exists
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      connection: true,
    },
  });

  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  // Queue the job
  await queueInvoiceJob({
    paymentId,
    connectionId: payment.connectionId,
  });

  return {
    success: true,
    message: 'Invoice creation retried',
  };
}

// Export the queue and functions for use in workers
module.exports = {
  invoiceQueue,
  queueInvoiceJob,
  retryInvoiceCreation
};

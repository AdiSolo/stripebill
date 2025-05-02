// workers/invoice-processor.js
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { createSmartBillInvoice } = require('../lib/smartbill');
const prisma = require('../lib/prisma');

// Set up Redis connection
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Initialize worker
const worker = new Worker('invoice-processing', async (job) => {
  console.log(`Processing job ${job.id}, attempt ${job.attemptsMade + 1}`);
  
  const { paymentId, connectionId } = job.data;
  
  try {
    // Process the invoice creation
    const result = await createSmartBillInvoice(paymentId, job.attemptsMade);
    
    console.log(`Invoice created successfully for payment ${paymentId}`);
    
    // Return success result
    return {
      success: true,
      invoiceId: result.invoiceId,
      invoiceLinkId: result.invoiceLinkId
    };
  } catch (error) {
    console.error(`Error processing invoice for payment ${paymentId}:`, error);
    
    // Log failure in database with retry information
    await prisma.auditLog.create({
      data: {
        eventType: 'invoice.retry',
        payload: {
          paymentId,
          connectionId,
          error: error.message,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts
        }
      }
    });
    
    // Check if this was the last retry attempt
    if (job.attemptsMade + 1 >= job.opts.attempts) {
      // Update or create InvoiceLink to reflect the failure
      await prisma.invoiceLink.upsert({
        where: { paymentId },
        update: { 
          status: 'FAILED',
          updatedAt: new Date()
        },
        create: {
          paymentId,
          smartbillId: 'FAILED', // Placeholder for failed invoices
          status: 'FAILED',
          connectionId
        }
      });
      
      // Log final failure
      await prisma.auditLog.create({
        data: {
          eventType: 'invoice.failed',
          payload: {
            paymentId,
            connectionId,
            error: error.message,
            finalAttempt: true
          }
        }
      });
    }
    
    // Throw the error to trigger retry logic in BullMQ
    throw error;
  }
}, { 
  connection: redisClient,
  // Concurrency for processing jobs
  concurrency: 5
});

// Handle completed jobs
worker.on('completed', async (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

// Handle failed jobs
worker.on('failed', async (job, error) => {
  console.error(`Job ${job.id} failed with error:`, error.message);
});

console.log('Invoice processor worker started');

// Keep the worker process alive
process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});

// Export worker for external use
module.exports = worker;

// lib/smartbill.js
import axios from 'axios';
import prisma from './prisma';

// SmartBill API utility functions
export async function createSmartBillInvoice(paymentId, retryAttempt = 0) {
  try {
    // 1. Get payment and connection data
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        connection: true
      }
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    // 2. Get client info from Stripe payment if available
    // In a real implementation, you'd extract this from Stripe
    // or store client info in a separate table
    const clientInfo = {
      name: 'Client Name', // This would be fetched from Stripe or your database
      vatCode: 'RO12345678', // This would be fetched from Stripe or your database
      address: 'Client Address',
      city: 'Client City',
      country: 'Romania',
      isTaxPayer: true
    };

    // 3. Prepare SmartBill invoice data
    const invoiceData = {
      companyVatCode: payment.connection.smartbillCIF,
      client: {
        name: clientInfo.name,
        vatCode: clientInfo.vatCode,
        address: clientInfo.address,
        city: clientInfo.city,
        country: clientInfo.country,
        isTaxPayer: clientInfo.isTaxPayer,
        saveToDb: true
      },
      isDraft: false,
      issueDate: new Date().toISOString().split('T')[0], // current date in YYYY-MM-DD
      seriesName: 'FCT',
      currency: payment.currency,
      language: 'RO',
      precision: 2,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +14 days
      products: [
        {
          name: 'Service Payment',
          code: 'SERVICE',
          quantity: 1,
          price: payment.amount / 100, // convert from cents to dollars/lei
          isTaxIncluded: true,
          taxName: 'TVA',
          taxPercentage: 19
        }
      ],
      payment: {
        value: payment.amount / 100, // convert from cents to dollars/lei
        type: 'Card',
        isCash: false
      }
    };

    // 4. Call SmartBill API
    const smartbillClient = createSmartBillClient(
      payment.connection.smartbillEmail,
      payment.connection.smartbillToken
    );
    
    const response = await smartbillClient.createInvoice(invoiceData);
    
    // 5. Store the invoice link
    const invoiceLink = await prisma.invoiceLink.create({
      data: {
        paymentId: payment.id,
        smartbillId: response.invoiceId || response.number,
        status: 'COMPLETED',
        connectionId: payment.connection.id
      }
    });
    
    // 6. Log success in audit log
    await prisma.auditLog.create({
      data: {
        eventType: 'invoice.created',
        payload: {
          paymentId: payment.id,
          smartbillId: response.invoiceId || response.number,
          connectionId: payment.connection.id,
          retryAttempt
        }
      }
    });
    
    return {
      success: true,
      invoiceId: response.invoiceId || response.number,
      invoiceLinkId: invoiceLink.id
    };
    
  } catch (error) {
    // Log error in audit log
    await prisma.auditLog.create({
      data: {
        eventType: 'invoice.error',
        payload: {
          paymentId,
          error: error.message,
          retryAttempt
        }
      }
    });
    
    throw error;
  }
}

// Get invoice download URL
export async function getSmartBillInvoiceDownloadUrl(invoiceLinkId) {
  try {
    // Get invoice link and connection details
    const invoiceLink = await prisma.invoiceLink.findUnique({
      where: { id: invoiceLinkId },
      include: {
        connection: true
      }
    });
    
    if (!invoiceLink) {
      throw new Error(`Invoice link ${invoiceLinkId} not found`);
    }
    
    // Create SmartBill client
    const smartbillClient = createSmartBillClient(
      invoiceLink.connection.smartbillEmail,
      invoiceLink.connection.smartbillToken
    );
    
    // Call SmartBill API to get PDF download URL
    const response = await smartbillClient.getInvoiceDownloadUrl(invoiceLink.smartbillId);
    
    // Update invoice link with download URL if it's not already set
    if (response.downloadUrl && !invoiceLink.downloadUrl) {
      await prisma.invoiceLink.update({
        where: { id: invoiceLinkId },
        data: { downloadUrl: response.downloadUrl }
      });
    }
    
    return response.downloadUrl;
    
  } catch (error) {
    // Log error
    console.error('Error getting invoice download URL:', error);
    throw error;
  }
}

// SmartBill client factory
function createSmartBillClient(email, token) {
  const baseUrl = process.env.SMARTBILL_API_URL || 'https://api.smartbill.ro';
  
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
      'Content-Type': 'application/json'
    }
  });
  
  return {
    // Create invoice in SmartBill
    async createInvoice(invoiceData) {
      try {
        const response = await client.post('/invoice', invoiceData);
        return response.data;
      } catch (error) {
        console.error('SmartBill API error:', error.response?.data || error.message);
        throw error;
      }
    },
    
    // Get invoice PDF download URL
    async getInvoiceDownloadUrl(invoiceId) {
      try {
        const response = await client.get(`/invoice/${invoiceId}/pdf`);
        return response.data;
      } catch (error) {
        console.error('SmartBill PDF download error:', error.response?.data || error.message);
        throw error;
      }
    }
  };
}
// app/api/invoices/download/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { getSmartBillInvoiceDownloadUrl } from '@/lib/smartbill';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Get invoice with connection and verify ownership
    const invoice = await prisma.invoiceLink.findUnique({
      where: { id },
      include: {
        connection: true
      }
    });
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Verify user has access to this invoice
    if (invoice.connection.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // If we already have a download URL, redirect to it
    if (invoice.downloadUrl) {
      return NextResponse.redirect(invoice.downloadUrl);
    }
    
    // Otherwise, get a new download URL
    const downloadUrl = await getSmartBillInvoiceDownloadUrl(id);
    
    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'Could not generate download link' },
        { status: 500 }
      );
    }
    
    // Update invoice with download URL
    await prisma.invoiceLink.update({
      where: { id },
      data: { 
        downloadUrl,
        updatedAt: new Date()
      }
    });
    
    // Log download in audit log
    await prisma.auditLog.create({
      data: {
        eventType: 'invoice.download',
        payload: {
          invoiceId: id,
          userId: session.user.id,
          smartbillId: invoice.smartbillId
        }
      }
    });
    
    // Redirect to download URL
    return NextResponse.redirect(downloadUrl);
    
  } catch (error) {
    console.error('Error downloading invoice:', error);
    return NextResponse.json(
      { error: 'Failed to download invoice' },
      { status: 500 }
    );
  }
}
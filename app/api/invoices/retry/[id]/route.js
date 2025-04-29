// app/api/invoices/retry/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { retryInvoiceCreation } from '@/lib/queue';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }
    
    const { id } = params; // This is the payment ID
    
    // Verify the payment exists and belongs to the user
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        connection: true
      }
    });
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Verify user has access to this payment
    if (payment.connection.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Retry invoice creation
    const result = await retryInvoiceCreation(id);
    
    // Log retry in audit log
    await prisma.auditLog.create({
      data: {
        eventType: 'invoice.manual_retry',
        payload: {
          paymentId: id,
          userId: session.user.id,
          connectionId: payment.connectionId
        }
      }
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error retrying invoice creation:', error);
    return NextResponse.json(
      { error: 'Failed to retry invoice creation' },
      { status: 500 }
    );
  }
}
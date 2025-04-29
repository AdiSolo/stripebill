// app/connections/[id]/webhook/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { setupConnectionWebhook, deleteConnectionWebhook } from '@/lib/stripe';

// Set up webhook for connection
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }
    
    // Verify connection exists and belongs to user
    const connection = await prisma.connection.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      );
    }
    
    // Check if NEXTAUTH_URL is set
    if (!process.env.NEXTAUTH_URL) {
      console.error('NEXTAUTH_URL environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    // Set up webhook
    try {
      const webhook = await setupConnectionWebhook(id);
      
      return NextResponse.json({
        success: true,
        webhookId: webhook.id
      });
    } catch (webhookError) {
      console.error('Error in setupConnectionWebhook:', webhookError);
      
      // Check for specific Stripe errors
      if (webhookError.type === 'StripeAuthenticationError') {
        return NextResponse.json(
          { error: 'Invalid Stripe API key. Please check your credentials.' },
          { status: 400 }
        );
      }
      
      if (webhookError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { error: 'Invalid request to Stripe API: ' + webhookError.message },
          { status: 400 }
        );
      }
      
      throw webhookError; // Re-throw for general error handling
    }
    
  } catch (error) {
    console.error('Error setting up webhook:', error);
    return NextResponse.json(
      { error: 'Failed to set up webhook', details: error.message },
      { status: 500 }
    );
  }
}

// Delete webhook for connection
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }
    
    // Verify connection exists and belongs to user
    const connection = await prisma.connection.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      );
    }
    
    // Delete webhook
    try {
      const result = await deleteConnectionWebhook(id);
      
      return NextResponse.json({
        success: true
      });
    } catch (webhookError) {
      console.error('Error in deleteConnectionWebhook:', webhookError);
      
      // Check for specific Stripe errors
      if (webhookError.type === 'StripeAuthenticationError') {
        return NextResponse.json(
          { error: 'Invalid Stripe API key. Please check your credentials.' },
          { status: 400 }
        );
      }
      
      if (webhookError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { error: 'Invalid request to Stripe API: ' + webhookError.message },
          { status: 400 }
        );
      }
      
      throw webhookError; // Re-throw for general error handling
    }
    
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook', details: error.message },
      { status: 500 }
    );
  }
}

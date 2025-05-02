// app/api/connections/[id]/webhook/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { setupConnectionWebhook, deleteConnectionWebhook } from '@/lib/stripe';

// Set up webhook for connection
export async function POST(request, { params }) {
  console.log('API Webhook setup request received for connection ID:', params.id);
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('Authentication failed: No session found');
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }
    
    console.log('Authenticated user:', session.user.id);
    
    const { id } = params;
    
    if (!id) {
      console.log('Missing connection ID in params');
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }
    
    // Verify connection exists and belongs to user
    console.log('Verifying connection exists and belongs to user');
    const connection = await prisma.connection.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });
    
    if (!connection) {
      console.log('Connection not found or access denied for ID:', id);
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      );
    }
    
    console.log('Connection found:', connection.id, connection.name);
    
    // Check if NEXTAUTH_URL is set
    if (!process.env.NEXTAUTH_URL) {
      console.error('NEXTAUTH_URL environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    console.log('NEXTAUTH_URL is set to:', process.env.NEXTAUTH_URL);
    
    // Set up webhook
    try {
      console.log('Calling setupConnectionWebhook with ID:', id);
      const webhook = await setupConnectionWebhook(id);
      
      console.log('Webhook setup successful:', webhook.id);
      return NextResponse.json({
        success: true,
        webhookId: webhook.id
      });
    } catch (webhookError) {
      console.error('Error in setupConnectionWebhook:', webhookError);
      console.error('Error details:', JSON.stringify({
        name: webhookError.name,
        message: webhookError.message,
        stack: webhookError.stack,
        type: webhookError.type,
        code: webhookError.code,
        statusCode: webhookError.statusCode,
        raw: webhookError.raw ? JSON.stringify(webhookError.raw) : undefined
      }));
      
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
      
      // Return detailed error information
      return NextResponse.json(
        { 
          error: 'Failed to set up webhook', 
          details: webhookError.message,
          name: webhookError.name,
          type: webhookError.type || 'Unknown',
          code: webhookError.code || 'Unknown'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error setting up webhook:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to set up webhook', 
        details: error.message,
        name: error.name,
        stack: error.stack
      },
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

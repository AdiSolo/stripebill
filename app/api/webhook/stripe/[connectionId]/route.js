import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import prisma from '@/lib/prisma';
import { createSmartBillInvoice } from '@/lib/smartbill';
import { queueInvoiceJob } from '@/lib/queue';

// This route handles incoming webhooks from Stripe
export async function POST(request, { params }) {
  const { connectionId } = params;
  
  try {
    // 1. Get the connection details
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: { user: true }
    });
    
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }
    
    // 2. Verify the webhook signature
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!connection.stripeWebhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 400 });
    }
    
    const stripe = new Stripe(connection.stripeApiKey);
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        connection.stripeWebhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed', err.message);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    
    // 3. Handle the event
    if (event.type === 'checkout.session.completed') {
      // Handle new subscription - update user plan
      const session = event.data.object;
      
      // Log this subscription event
      await prisma.auditLog.create({
        data: {
          eventType: 'subscription.created',
          payload: { 
            userId: connection.userId,
            stripePlanId: session.metadata?.planId,
            stripeSessionId: session.id
          }
        }
      });
      
      // Update user's plan
      if (session.metadata?.planId) {
        await prisma.user.update({
          where: { id: connection.userId },
          data: { plan: session.metadata.planId === 'pro' ? 'PRO' : 'BASIC' }
        });
      }
      
      return NextResponse.json({ received: true });
    }
    
    if (event.type === 'payment_intent.succeeded') {
      // Handle a successful payment by creating an invoice
      const paymentIntent = event.data.object;
      
      // 1. Create/Update payment record
      const payment = await prisma.payment.upsert({
        where: { stripeId: paymentIntent.id },
        update: { 
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        },
        create: {
          stripeId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          connectionId: connection.id
        }
      });
      
      // 2. Log in audit log
      await prisma.auditLog.create({
        data: {
          eventType: 'payment.received',
          payload: {
            paymentId: payment.id,
            stripeId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          }
        }
      });
      
      // 3. Queue invoice creation job
      await queueInvoiceJob({
        paymentId: payment.id,
        connectionId: connection.id
      });
      
      return NextResponse.json({ received: true });
    }
    
    if (event.type === 'customer.subscription.deleted') {
      // Handle subscription deletion - downgrade user if needed
      const subscription = event.data.object;
      
      // Log this subscription deletion
      await prisma.auditLog.create({
        data: {
          eventType: 'subscription.deleted',
          payload: { 
            userId: connection.userId,
            stripeSubscriptionId: subscription.id
          }
        }
      });
      
      // Downgrade user to BASIC plan
      await prisma.user.update({
        where: { id: connection.userId },
        data: { plan: 'BASIC' }
      });
      
      return NextResponse.json({ received: true });
    }
    
    // Handle other event types
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
// lib/stripe.js
import { Stripe } from 'stripe';
import prisma from './prisma';

// Create a Stripe instance with the provided API key
export function createStripeClient(apiKey) {
  return new Stripe(apiKey, {
    apiVersion: '2023-10-16',
  });
}

// Create a Stripe checkout session for subscription
export async function createCheckoutSession(userId, planId) {
  const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY);
  
  // Get price ID based on plan
  const priceId = planId === 'pro' 
    ? process.env.STRIPE_PRICE_PRO 
    : process.env.STRIPE_PRICE_BASIC;
  
  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${planId}`);
  }
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
    client_reference_id: userId,
    metadata: {
      userId,
      planId,
    },
  });
  
  // Log in audit trail
  await prisma.auditLog.create({
    data: {
      eventType: 'checkout.created',
      payload: {
        userId,
        planId,
        sessionId: session.id,
      },
    },
  });
  
  return session;
}

// Set up a webhook endpoint for a connection
export async function setupConnectionWebhook(connectionId) {
  try {
    // Get connection
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });
    
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    // Create Stripe client with connection's API key
    const stripe = createStripeClient(connection.stripeApiKey);
    
    // Create webhook endpoint
    const webhook = await stripe.webhookEndpoints.create({
      url: `${process.env.NEXTAUTH_URL}/api/webhook/stripe/${connectionId}`,
      enabled_events: [
        'payment_intent.succeeded',
        'checkout.session.completed',
        'customer.subscription.deleted',
      ],
      description: `SmartBill integration for ${connection.name}`,
    });
    
    // Update connection with webhook details
    await prisma.connection.update({
      where: { id: connectionId },
      data: {
        stripeWebhookId: webhook.id,
        stripeWebhookSecret: webhook.secret,
      },
    });
    
    // Log in audit trail
    await prisma.auditLog.create({
      data: {
        eventType: 'webhook.created',
        payload: {
          connectionId,
          webhookId: webhook.id,
        },
      },
    });
    
    return webhook;
  } catch (error) {
    console.error('Error setting up Stripe webhook:', error);
    throw error;
  }
}

// Delete a webhook endpoint for a connection
export async function deleteConnectionWebhook(connectionId) {
  try {
    // Get connection
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });
    
    if (!connection || !connection.stripeWebhookId) {
      return { success: true, message: 'No webhook to delete' };
    }
    
    // Create Stripe client with connection's API key
    const stripe = createStripeClient(connection.stripeApiKey);
    
    // Delete webhook endpoint
    await stripe.webhookEndpoints.del(connection.stripeWebhookId);
    
    // Update connection to remove webhook details
    await prisma.connection.update({
      where: { id: connectionId },
      data: {
        stripeWebhookId: null,
        stripeWebhookSecret: null,
      },
    });
    
    // Log in audit trail
    await prisma.auditLog.create({
      data: {
        eventType: 'webhook.deleted',
        payload: {
          connectionId,
          webhookId: connection.stripeWebhookId,
        },
      },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting Stripe webhook:', error);
    throw error;
  }
}

// Verify a Stripe API key is valid
export async function verifyStripeApiKey(apiKey) {
  try {
    const stripe = createStripeClient(apiKey);
    
    // Try to fetch balance, which requires a valid API key
    await stripe.balance.retrieve();
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message 
    };
  }
}
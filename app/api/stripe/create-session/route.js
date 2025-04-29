// app/api/stripe/create-session/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createCheckoutSession } from '@/lib/stripe';

// Create a Stripe checkout session for subscription
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }
    
    // Get plan from request body
    const { planId } = await request.json();
    
    if (!planId || !['basic', 'pro'].includes(planId.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }
    
    // Create checkout session
    const checkoutSession = await createCheckoutSession(
      session.user.id,
      planId.toLowerCase()
    );
    
    // Return session ID
    return NextResponse.json({ sessionId: checkoutSession.id });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
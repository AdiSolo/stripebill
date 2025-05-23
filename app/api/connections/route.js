// app/api/connections/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// 1️⃣ LISTARE conexiuni
export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  const connections = await prisma.connection.findMany({
    where: { userId: session.user.id },
  });
  return NextResponse.json(connections);
}

// 2️⃣ ADAUGĂ conexiune nouă
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Extragem câmpurile din body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body. Please check your input.' },
        { status: 400 }
      );
    }

    const { name, stripeApiKey, smartbillEmail, smartbillToken, smartbillCIF } = requestBody;

    // Validate required fields
    if (!name || !stripeApiKey || !smartbillEmail || !smartbillToken || !smartbillCIF) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // Verificăm limita de conexiuni în funcție de plan
    const existingCount = await prisma.connection.count({
      where: { userId: session.user.id },
    });
    const limit = session.user.plan === 'PRO' ? 3 : 1;
    if (existingCount >= limit) {
      return NextResponse.json(
        { error: 'Upgrade plan to add more connections.' },
        { status: 400 }
      );
    }

    // Creăm conexiunea în DB
    const connection = await prisma.connection.create({
      data: {
        name,
        stripeApiKey,
        smartbillEmail,
        smartbillToken,
        smartbillCIF,
        user: {
          connect: {
            id: session.user.id
          }
        }
      },
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json(
      { error: 'Failed to create connection. Please try again.' },
      { status: 500 }
    );
  }
}

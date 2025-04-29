// app/api/payments/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// Get all payments for user's connections
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    
    // Get search params
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');
    const status = searchParams.get('status');
    const limit = Number(searchParams.get('limit')) || 20;
    const page = Number(searchParams.get('page')) || 1;
    const offset = (page - 1) * limit;
    
    // Build query filter
    let where = {};
    
    // Add connection filter if specified
    if (connectionId) {
      // Verify user owns this connection
      const connection = await prisma.connection.findFirst({
        where: {
          id: connectionId,
          userId: session.user.id
        }
      });
      
      if (!connection) {
        return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
      }
      
      where.connectionId = connectionId;
    } else {
      // Get all user's connections
      const connections = await prisma.connection.findMany({
        where: {
          userId: session.user.id
        },
        select: {
          id: true
        }
      });
      
      where.connectionId = {
        in: connections.map(c => c.id)
      };
    }
    
    // Add status filter if specified
    if (status) {
      where.status = status;
    }
    
    // Get payments with invoice status and pagination
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          connection: {
            select: {
              id: true,
              name: true
            }
          },
          // Include invoice link if it exists
          invoiceLink: {
            select: {
              id: true,
              smartbillId: true,
              status: true,
              downloadUrl: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.payment.count({ where })
    ]);
    
    // Return payments with pagination info
    return NextResponse.json({
      data: payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

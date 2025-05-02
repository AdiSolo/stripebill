// app/api/connections/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '../../../../lib/prisma'; // adaptează calea dacă nu foloseşti alias

// 1️⃣ UPDATE conexiune
export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect('/auth/signin');

  const { id } = params;
  const data = await request.json();

  const updated = await prisma.connection.updateMany({
    where: { id, userId: session.user.id },
    data,
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

// 2️⃣ DELETE conexiune
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect('/auth/signin');

  const { id } = params;
  const deleted = await prisma.connection.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

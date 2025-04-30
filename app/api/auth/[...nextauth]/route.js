// app/api/auth/[...nextauth]/route.js

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

/**
 * Exportăm opțiunile de configurare NextAuth pentru a le folosi și
 * în celelalte route-handler-e (getServerSession).
 */
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Email + Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) {
          throw new Error('No user found with that email');
        }
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          throw new Error('Invalid password');
        }
        // Returnăm obiectul user care va fi serializat în token
        return { id: user.id, email: user.email, plan: user.plan };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // La prima autentificare, user conține date din DB
      if (user) {
        token.id = user.id;
        token.plan = user.plan;
      }
      return token;
    },
    async session({ session, token }) {
      // Injectăm user ID și plan din token în sesiune
      session.user.id = token.id;
      session.user.plan = token.plan;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
};

// Cream handlerul NextAuth pe baza authOptions
const handler = NextAuth(authOptions);

// În App Router, NextAuth trebuie expus atât pe GET, cât și pe POST
export { handler as GET, handler as POST };
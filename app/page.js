'use client';
import Link from 'next/link';
import Image from 'next/image';
import { SignOutButton } from './components/signout';
import { useSession } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-semibold text-gray-900">Stripe-SmartBill</span>
              </div>
            </div>
            <div className="flex items-center">
              {!isAuthenticated ? (
                <>
                  <Link
                    href="/auth/signin"
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-blue-600 border border-blue-600 hover:bg-blue-50"
                  >
                    Register
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/connections"
                    className="px-4 py-2 rounded-md text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    My Connections
                  </Link>
                  <SignOutButton className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-red-600 border border-red-600 hover:bg-red-50" />
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <div className="bg-gray-50 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
            Connect Stripe to SmartBill
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Seamlessly generate SmartBill invoices from Stripe payments automatically and in real-time.
          </p>
          <div className="mt-8 space-x-4">
            <Link
              href={isAuthenticated ? "/connections" : "/auth/register"}
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              {isAuthenticated ? "Go to Dashboard" : "Get Started"}
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Features section */}
      <section id="features" className="py-16 bg-white flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-blue-600 uppercase tracking-wide">Features</h2>
            <p className="mt-1 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Everything you need for automated invoicing
            </p>
            <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
              Connect your Stripe account to SmartBill and let our service handle the rest.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature items... (repeat as needed) */}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Footer columns... */}
          </div>
        </div>
      </footer>
    </div>
  );
}

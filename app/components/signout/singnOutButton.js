"use client"
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export const SignOutButton = ({ className = '' }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      
      // Call the API endpoint
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Use NextAuth's signOut to handle the client-side session clean-up
      await signOut({ redirect: false });
      
      // Redirect to home page or sign-in page after successful sign-out
      router.push('/auth/signin');
      
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={`${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {isLoading ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
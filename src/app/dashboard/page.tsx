"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/config';
import { CoinDisplay, TransactionHistory } from '../coins/page-integration';
import { isUserAuthenticated } from '@/lib/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      setLoading(true);
      
      // Check if user is authenticated
      const isAuthenticated = await isUserAuthenticated();
      
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }
      
      // Get user details
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    }
    
    checkAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/auth/login');
      } else {
        setUser(session.user);
      }
    });
    
    // Clean up subscription
    return () => subscription.unsubscribe();
  }, [router]);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-pulse p-8 bg-white rounded-lg shadow-md">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-24 bg-gray-200 rounded mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
        
        {user && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">User Profile</h2>
            <div className="flex items-center space-x-4">
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl text-blue-500">
                    {(user.email?.charAt(0) || user.user_metadata?.display_name?.charAt(0) || '?').toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="font-medium">
                  {user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-sm text-gray-500">{user.email}</div>
                <div className="text-xs text-gray-400">
                  User ID: {user.id.substring(0, 8)}...
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Real-time coin balance display */}
        <CoinDisplay />
        
        {/* Transaction history */}
        <TransactionHistory />
        
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
          <div className="space-y-4">
            <p>
              Your account is now connected with our real-time coin system. Try earning or spending coins and watch your balance update instantly!
            </p>
            <p>
              From here, you can:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Navigate to the subtitle downloader to process videos</li>
              <li>Translate existing subtitles to other languages</li>
              <li>Manage your coin balance and view your transaction history</li>
              <li>Update your profile settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { supabase } from "@/supabase/config";
import { signOutUser } from "@/app/auth/supabase";
import Link from "next/link";

export default function UserProfile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get user data from session
          setUser({
            displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email,
            photoURL: session.user.user_metadata?.avatar_url
          });
        }
      } catch (error) {
        console.error("Error checking authentication status:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email,
          photoURL: session.user.user_metadata?.avatar_url
        });
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200"></div>
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
          <div className="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/auth/login">Login</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/auth/signup">Sign Up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Avatar>
        <AvatarImage src={user.photoURL || ""} alt={user.displayName} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {user.displayName?.charAt(0) || "U"}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium">{user.displayName}</p>
        <p className="text-xs text-gray-500">{user.email}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}

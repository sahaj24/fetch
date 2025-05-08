"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Coins, Settings, User, LogOut, FileText } from "lucide-react";
import { supabase } from "@/supabase/config";
import { signOutUser } from "@/app/auth/supabase";

export default function UserNav() {
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
      // First manually clear any coin data
      if (typeof window !== 'undefined' && window.localStorage) {
        // Clear any coin-related cache
        Object.keys(window.localStorage)
          .filter(key => key.includes('coin') || key.includes('user_'))
          .forEach(key => window.localStorage.removeItem(key));
      }
      
      // Sign out through Supabase directly
      await supabase.auth.signOut();
      
      // Force an immediate hard refresh of the page
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
      // If error, still try to refresh the page
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <Avatar className="h-9 w-9">
        <AvatarFallback>
          <span className="animate-pulse">...</span>
        </AvatarFallback>
      </Avatar>
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} />
            <AvatarFallback>
              {(user.displayName || "User").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>

          <DropdownMenuItem asChild>
            <Link href="/coins" className="cursor-pointer flex w-full items-center">
              <Coins className="mr-2 h-4 w-4" />
              <span>Coins</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/history" className="cursor-pointer flex w-full items-center">
              <FileText className="mr-2 h-4 w-4" />
              <span>History</span>
            </Link>
          </DropdownMenuItem>
          
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

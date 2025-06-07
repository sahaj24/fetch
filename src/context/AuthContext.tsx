"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/supabase/config";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { initializeUserCoins } from "@/utils/coinUtils";

// Define types for our auth context
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean, error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean, error?: string }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean, error?: string }>;
  updateProfile: (data: { name?: string, photoURL?: string }) => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => ({ success: false, error: "Not implemented" }),
  signUp: async () => ({ success: false, error: "Not implemented" }),
  signOut: async () => {},
  sendPasswordResetEmail: async () => ({ success: false, error: "Not implemented" }),
  updateProfile: async () => false
});

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);
      
      // If user is logged in, initialize coins if needed
      if (session?.user) {
        await initializeUserCoins(session.user.id);
      }
      
      setIsLoading(false);
    };
    
    initializeAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      
      // If user is logged in, initialize coins if needed
      if (session?.user) {
        await initializeUserCoins(session.user.id);
      }
      
      setIsLoading(false);
    });
    
    // Clean up the subscription
    return () => subscription.unsubscribe();
  }, []);

  // Sign in functionality
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      // Initialize coins for user if needed
      if (data.user) {
        await initializeUserCoins(data.user.id);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Error signing in:", error);
      
      // Handle different error codes
      let errorMessage = "Failed to sign in. Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Sign up functionality
  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Create new user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Don't manually create a profile - this is handled by the database trigger
      // Just initialize coins for the new user with 50 coins welcome bonus
      if (data.user) {
        await initializeUserCoins(data.user.id);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Error signing up:", error);
      
      let errorMessage = "Failed to sign up. Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Sign out functionality
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Password reset email
  const sendPasswordResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (error) {
        throw error;
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      
      let errorMessage = "Failed to send reset email. Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Update user profile
  const updateProfile = async (data: { name?: string, photoURL?: string }) => {
    try {
      if (!user) {
        throw new Error("No authenticated user");
      }
      
      // Update user metadata
      if (data.name) {
        const { error } = await supabase.auth.updateUser({
          data: {
            display_name: data.name
          }
        });
        
        if (error) {
          throw error;
        }
      }
      
      // Update profile in profiles table (not user_profiles)
      // using id as the primary key (not user_id)
      const updateData: any = {};
      if (data.name) updateData.display_name = data.name;
      if (data.photoURL) updateData.avatar_url = data.photoURL; // uses avatar_url not photo_url
      
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id); // use id, not user_id
          
        if (error) {
          throw error;
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      return false;
    }
  };

  // Auth context value
  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    sendPasswordResetEmail,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

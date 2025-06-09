import { supabase } from '@/supabase/config';

export interface AuthError {
  code: string;
  message: string;
}

// Check if the user is authenticated
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

// Get the current user's token
export async function getUserToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
}

// Get the current user's ID
export async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// Format Supabase errors to user-friendly messages
export function formatAuthError(error: any): string {
  if (!error) return 'Unknown error occurred';
  
  const errorMessage = error.message || error.toString();
  
  // Common Supabase error messages
  if (errorMessage.includes('Email not confirmed')) {
    return 'Please check your email to confirm your account before signing in.';
  }
  
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  
  if (errorMessage.includes('Email already in use')) {
    return 'An account with this email already exists.';
  }
  
  if (errorMessage.includes('Password should be at least 6 characters')) {
    return 'Password should be at least 6 characters.';
  }
  
  return errorMessage;
}

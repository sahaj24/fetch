// Enhanced Supabase Authentication Functions with consistent naming
import { supabase } from '../../supabase/config';
import { createUserCoins, ensureUserCoins } from "../coins/core";

// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Initialize coins for existing users during sign-in
    if (data?.user) {
      try {
        console.log('Ensuring coins for user:', data.user.id);
        await ensureUserCoins(data.user.id);
      } catch (coinError) {
        console.error('Error ensuring user coins at login:', coinError);
        // Continue anyway, as auth was successful
      }
    }
    
    return { user: data.user, error: null };
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    return { user: null, error: error.message };
  }
}

// Export with alternate name for backward compatibility
export const emailSignIn = signInWithEmail;

// Sign up with email and password
export async function signUpWithEmail(email: string, password: string, displayName: string = '') {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      }
    });
    
    if (error) throw error;
    
    // Create user profile and initialize coins if sign up is successful
    if (data?.user) {
      try {
        // Create profile
        await supabase.from('profiles').insert({
          id: data.user.id,
          display_name: displayName || email.split('@')[0],
          email,
          created_at: new Date().toISOString(),
        });
        
        // Initialize coins directly
        console.log('Creating coins for new user:', data.user.id);
        await createUserCoins(data.user.id);
      } catch (profileError) {
        console.error('Error setting up user profile:', profileError);
        // We still return success as auth account was created
      }
    }
    
    return { user: data.user, error: null };
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    return { user: null, error: error.message };
  }
}

// Export with alternate names for backward compatibility
export const signUp = signUpWithEmail;
export const emailSignUp = signUpWithEmail;

// Sign in with Google
export async function signInWithGoogle() {
  try {
    // Use a dedicated Supabase callback URL to avoid conflicts with NextAuth
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?ensure_coins=true`,
        scopes: 'email profile',
      }
    });
    
    if (error) throw error;
    
    // Note: We can't ensure coins here because this is a redirect flow
    // We'll handle this in the callback page by checking the URL param
    return { user: null, error: null };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return { user: null, error: error.message };
  }
}

// Export with alternate name for backward compatibility
export const googleSignIn = signInWithGoogle;

// Sign out
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return { success: false, error: error.message };
  }
}

// Send password reset email
export async function sendPasswordReset(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(data: { displayName?: string; photoURL?: string }) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) throw new Error('User not authenticated');
    
    // Update user metadata
    const updates: any = { data: {} };
    
    if (data.displayName) {
      updates.data.display_name = data.displayName;
    }
    
    if (data.photoURL) {
      updates.data.avatar_url = data.photoURL;
    }
    
    const { error: updateError } = await supabase.auth.updateUser(updates);
    
    if (updateError) throw updateError;
    
    // Also update in profiles table
    const profileUpdates: any = {};
    
    if (data.displayName) {
      profileUpdates.display_name = data.displayName;
    }
    
    if (data.photoURL) {
      profileUpdates.avatar_url = data.photoURL;
    }
    
    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);
        
      if (profileError) throw profileError;
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Profile update error:', error);
    return { success: false, error: error.message };
  }
}

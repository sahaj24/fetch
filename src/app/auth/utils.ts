import { User } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

// Store user session data in localStorage
export function saveUserSession(user: User) {
  const userData = {
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
    photoURL: user.user_metadata?.avatar_url,
    lastLogin: new Date().toISOString(),
  };
  
  localStorage.setItem('fetchsub_user', JSON.stringify(userData));
  return userData;
}

// Welcome notification with personalized message
export function showWelcomeNotification(userData: any, isNewUser: boolean = false) {
  const userName = userData.displayName;
  
  if (isNewUser) {
    toast.success(
      `Welcome to FetchSub, ${userName}! Your account has been created successfully.`,
      { duration: 5000 }
    );
  } else {
    const greeting = getTimeBasedGreeting();
    toast.success(
      `${greeting}, ${userName}! Welcome back to FetchSub.`,
      { duration: 3000 }
    );
  }
}

// Get appropriate greeting based on time of day
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 18) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

// Update user preferences
export function updateUserPreferences(preferences: any) {
  try {
    const userData = getCurrentUser();
    if (!userData) return;
    
    const updatedPreferences = {
      ...userData.preferences,
      ...preferences
    };
    
    const updatedUserData = {
      ...userData,
      preferences: updatedPreferences
    };
    
    localStorage.setItem('fetchsub_user', JSON.stringify(updatedUserData));
  } catch (err) {
    console.error('Failed to update preferences:', err);
  }
}

// Get current user data
export function getCurrentUser() {
  try {
    const userDataStr = localStorage.getItem('fetchsub_user');
    return userDataStr ? JSON.parse(userDataStr) : null;
  } catch (err) {
    console.error('Failed to get user data from localStorage:', err);
    return null;
  }
}

// Clear user session
export function clearUserSession() {
  localStorage.removeItem('fetchsub_user');
}

import { supabase } from "@/supabase/config";

export interface HistoryItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  prompt: string;
  response: string;
  metadata: any;
  created_at: string;
}

// Get user history
export async function getUserHistory(limit: number = 20): Promise<HistoryItem[]> {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('User not authenticated');
      return [];
    }
    
    // Query history from Supabase
    const { data, error } = await supabase
      .from('user_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user history:', error);
    return [];
  }
}

// Add history item
export async function addHistoryItem(data: {
  type: string;
  title: string;
  prompt: string;
  response: string;
  metadata?: any;
}): Promise<string | null> {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('User not authenticated');
      return null;
    }
    
    // Insert history item
    const { data: insertedItem, error } = await supabase
      .from('user_history')
      .insert({
        user_id: session.user.id,
        type: data.type,
        title: data.title,
        prompt: data.prompt,
        response: data.response,
        metadata: data.metadata || {},
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      throw error;
    }
    
    return insertedItem?.id || null;
  } catch (error) {
    console.error('Error adding history item:', error);
    return null;
  }
}

// Delete history item
export async function deleteHistoryItem(id: string): Promise<boolean> {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('User not authenticated');
      return false;
    }
    
    // Delete history item (ensure it belongs to the user)
    const { error } = await supabase
      .from('user_history')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting history item:', error);
    return false;
  }
}

// Clear all history
// Add download to history
export async function addToDownloadHistory(
  url: string,
  videoId: string,
  title: string,
  thumbnail: string,
  format: string,
  language: string
): Promise<string | null> {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('User not authenticated');
      return null;
    }
    
    // Add the download to history
    const { data, error } = await supabase
      .from('user_history')
      .insert({
        user_id: session.user.id,
        type: 'download',
        title: title,
        prompt: url,
        response: '',
        metadata: {
          videoId,
          thumbnail,
          format,
          language
        }
      })
      .select('id')
      .single();
    
    if (error) {
      throw error;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Error adding download to history:', error);
    return null;
  }
}

export async function clearAllHistory(): Promise<boolean> {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('User not authenticated');
      return false;
    }
    
    // Delete all history items for this user
    const { error } = await supabase
      .from('user_history')
      .delete()
      .eq('user_id', session.user.id);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
}

// Get single history item
export async function getHistoryItem(id: string): Promise<HistoryItem | null> {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('User not authenticated');
      return null;
    }
    
    // Query history item
    const { data, error } = await supabase
      .from('user_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data || null;
  } catch (error) {
    console.error('Error fetching history item:', error);
    return null;
  }
}

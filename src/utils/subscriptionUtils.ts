import { supabase } from "@/supabase/config";

/**
 * Initialize the user_subscriptions table for a new user
 * @param userId The user's ID
 * @param planName The subscription plan name
 * @param subscriptionId The PayPal subscription ID
 */
export async function initializeUserSubscription(
  userId: string,
  planName: string,
  subscriptionId: string
): Promise<boolean> {
  try {
    // Check if the user already has a subscription record
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    const now = new Date().toISOString();

    if (existingSubscription) {
      // Update the existing subscription
      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          plan_name: planName,
          subscription_id: subscriptionId,
          status: "active",
          last_payment_date: now,
          updated_at: now,
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating user subscription:", updateError);
        return false;
      }
    } else {
      // Create a new subscription record
      const { error: insertError } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: userId,
          plan_name: planName,
          subscription_id: subscriptionId,
          status: "active",
          last_payment_date: now,
          created_at: now,
          updated_at: now,
        });

      if (insertError) {
        console.error("Error creating user subscription:", insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error in initializeUserSubscription:", error);
    return false;
  }
}

/**
 * Get a user's active subscription
 * @param userId The user's ID
 */
export async function getUserSubscription(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error) {
      console.error("Error fetching user subscription:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getUserSubscription:", error);
    return null;
  }
}

/**
 * Cancel a user's subscription
 * @param userId The user's ID
 */
export async function cancelUserSubscription(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) {
      console.error("Error cancelling user subscription:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in cancelUserSubscription:", error);
    return false;
  }
}

/**
 * Check if a user has an active subscription
 * @param userId The user's ID
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in hasActiveSubscription:", error);
    return false;
  }
}

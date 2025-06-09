import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Direct coin deduction API endpoint using the working spend_user_coins RPC function
 * This implementation mirrors the approach in the coin-debug page
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from headers
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      console.error("🔴 Direct Deduct API: Missing user ID in headers");
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required' 
      }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { 
      amount = 10, // Default to 10 coins if not specified
      description = 'Service charge'
    } = body;
    
    
    // First, we need to get the user record to ensure we have a valid Supabase UUID
    // The userId from headers might be a Firebase-style ID and not a valid Postgres UUID
    let { data: userCoinsData, error: userLookupError } = await supabase
      .from('user_coins')
      .select('user_id, balance')
      .eq('auth_id', userId) // Using auth_id column which stores Firebase IDs
      .maybeSingle();
    
    if (userLookupError || !userCoinsData) {
      // Try direct match as fallback
      const { data: directUserData, error: directLookupError } = await supabase
        .from('user_coins')
        .select('user_id, balance')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (directLookupError || !directUserData) {
        console.error('🔴 Error looking up user coins record:', userLookupError || directLookupError);
        return NextResponse.json({ 
          success: false, 
          message: 'User record not found',
          error: (userLookupError || directLookupError)?.message 
        }, { status: 404 });
      }
      
      userCoinsData = directUserData;
    }
    
    // Now we have the valid supabase user_id that works with our database
    const supabaseUserId = userCoinsData.user_id;
    const currentBalance = userCoinsData.balance;
    
    // Check if user has enough coins
    if (currentBalance < amount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient coins',
        currentBalance,
        required: amount
      }, { status: 400 });
    }
    
    // Generate a unique transaction ID
    const transactionId = `direct_deduct_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Instead of using RPC, perform the deduction manually
    // This avoids UUID format errors with the RPC function
    try {
      // Start transaction - first record the transaction
      const { error: txnError } = await supabase
        .from('transactions')
        .insert({
          user_id: supabaseUserId,
          amount,
          type: 'spend',
          description,
          transaction_id: transactionId,
          created_at: new Date().toISOString()
        });
      
      if (txnError) {
        console.error('🔴 Error recording transaction:', txnError);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to record transaction',
          error: txnError.message 
        }, { status: 500 });
      }
      
      // Second, update the balance
      const newBalance = currentBalance - amount;
      const { error: updateError } = await supabase
        .from('user_coins')
        .update({ balance: newBalance })
        .eq('user_id', supabaseUserId);
      
      if (updateError) {
        console.error('🔴 Error updating balance:', updateError);
        // Try to rollback by deleting the transaction we just created
        await supabase
          .from('transactions')
          .delete()
          .eq('transaction_id', transactionId);
          
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to update balance',
          error: updateError.message 
        }, { status: 500 });
      }
      
      // Success - return the updated balance
      
      return NextResponse.json({
        success: true,
        remainingBalance: newBalance,
        deducted: amount
      });
      
    } catch (deductError) {
      console.error('🔴 Error in deduction process:', deductError);
      return NextResponse.json({
        success: false,
        message: 'Error during deduction process',
        error: deductError instanceof Error ? deductError.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('🔴 Error in direct coin deduction API:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
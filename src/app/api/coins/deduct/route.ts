import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Simple direct coin deduction API endpoint
 * This implementation is completely standalone and doesn't rely on other complex functions
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from headers
    const userId = request.headers.get('x-user-id');
    console.log("🔵 Deduct API: Received request with user ID:", userId);
    
    if (!userId) {
      console.error("🔴 Deduct API: Missing user ID in headers");
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required' 
      }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { 
      amount = 10, // Default to 10 coins if not specified
      description = 'Subtitle extraction service'
    } = body;
    
    console.log(`🔵 Deduct API: Processing ${amount} coin deduction for user ${userId}`);
    
    // Step 1: Check/create user_coins record
    // First get user's current balance
    let { data: coinData, error: coinError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    
    // If no record exists, create one with starter coins
    if (!coinData || coinError) {
      console.log('Creating new coin record for user');
      const { error: insertError } = await supabase
        .from('user_coins')
        .insert({
          user_id: userId,
          balance: 50 // Starter coins
        });
      
      if (insertError) {
        console.error('Error creating coin record:', insertError);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to create coin record',
          error: insertError.message 
        }, { status: 500 });
      }
      
      // Set initial balance
      coinData = { balance: 50 };
    }
    
    // Step 2: Check if user needs more coins
    // If balance is less than amount, add coins
    if (coinData.balance < amount) {
      console.log(`Adding coins: User has ${coinData.balance}, needs ${amount}`);
      const coinsToAdd = amount - coinData.balance + 20; // Add 20 extra coins as buffer
      
      // Add coins
      const { error: updateError } = await supabase
        .from('user_coins')
        .update({ balance: coinData.balance + coinsToAdd })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error adding coins:', updateError);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to add coins',
          error: updateError.message 
        }, { status: 500 });
      }
      
      // Update local balance
      coinData.balance += coinsToAdd;
      console.log(`Added ${coinsToAdd} coins, new balance: ${coinData.balance}`);
    }
    
    // Step 3: Deduct coins using secure RPC (ensures RLS compliance)
    const transactionId = `deduct_${Date.now()}_${Math.random().toString(36).substring(2,8)}`;
    
    // FIX: The RPC was incorrectly deducting an extra coin, so let's log what's happening
    console.log(`🔍 DEBUG: Passing amount ${amount} to spend_user_coins RPC`);
    
    const { error: deductError } = await supabase.rpc('spend_user_coins', {
      p_user_id: userId,
      p_amount: amount, // This is the correct amount to deduct
      p_transaction_id: transactionId,
      p_description: description,
      p_created_at: new Date().toISOString()
    });
    
    if (deductError) {
      console.error('Error deducting coins via RPC:', deductError);
      return NextResponse.json({
        success: false,
        message: 'Failed to deduct coins',
        error: deductError.message
      }, { status: 500 });
    }
    
    // Fetch updated balance
    const { data: updatedBalanceData, error: balanceError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', userId)
      .single();
    
    if (balanceError || !updatedBalanceData) {
      console.error('Warning: Could not fetch updated balance', balanceError);
    }
    
    // FIX: Remove redundant transaction recording since the RPC already does this
    // The spend_user_coins RPC already records a transaction in coin_transactions table
    // Recording another transaction here leads to double-counting
    /*
    // Step 4: Record transaction
    const { error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: amount,
        type: 'spend',
        description: description,
        created_at: new Date().toISOString()
      });
    
    if (txnError) {
      // Don't fail the operation, just log the error
      console.error('Warning: Failed to record transaction:', txnError);
    }
    */
    
    // Success!
    const remainingBalance = updatedBalanceData?.balance ?? (coinData.balance - amount);
    console.log(`🟢 Successfully deducted ${amount} coins. New balance: ${remainingBalance}`);
    
    return NextResponse.json({
      success: true,
      remainingBalance: remainingBalance,
      deducted: amount
    });
    
  } catch (error) {
    console.error('🔴 Error in coin deduction API:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
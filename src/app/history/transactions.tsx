"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabase/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/utils/date";

type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
};

export default function TransactionsHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);
        // In a real app, you'd get the user ID from auth context or session
        const userId = "test-user";
        
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setTransactions(data || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    }
    
    fetchTransactions();
  }, []);

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading transactions...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : transactions.length === 0 ? (
            <p>No transactions found.</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-4 border rounded-md">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {transaction.type === 'credit' ? 'Added' : 'Used'}{' '}
                      {Math.abs(transaction.amount)} coins
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(transaction.created_at)}
                    </span>
                  </div>
                  {transaction.description && (
                    <p className="mt-2 text-sm">{transaction.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
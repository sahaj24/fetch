"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  formatCoins, 
  SUBSCRIPTION_TIERS, 
  updateSubscription
} from "@/app/coins/utils";
import { useCoins } from "@/app/coins/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Loader2, CreditCard, History, Check, AlertCircle, TrendingUp, Zap, RefreshCw } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function CoinsPage() {
  const router = useRouter();
  const { coins: userCoins, isLoading: loading, error, refreshCoins } = useCoins(60000); // Auto-refresh every minute
  const [processingPurchase, setProcessingPurchase] = useState(false);

  // Calculate dates for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  // Handle subscription purchase
  const handleSubscribe = async (tier: keyof typeof SUBSCRIPTION_TIERS) => {
    try {
      setProcessingPurchase(true);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update subscription
      const success = await updateSubscription(tier);
      
      if (success) {
        toast.success(`Successfully subscribed to ${SUBSCRIPTION_TIERS[tier].name} plan!`);
        refreshCoins(); // Reload user coins using our global state management
      } else {
        throw new Error("Failed to update subscription");
      }
    } catch (err) {
      console.error("Error processing subscription:", err);
      toast.error("Failed to process subscription");
    } finally {
      setProcessingPurchase(false);
    }
  };

  if (loading && !userCoins) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p>Error loading coin data. Please try again.</p>
        <Button onClick={refreshCoins}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const currentTier = userCoins?.subscriptionTier || 'FREE';
  
  return (
    <div className="container mx-auto py-12 px-4">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Coin Management</h1>
            <p className="text-gray-500">Manage your FetchSub coins and subscription</p>
          </div>
          
          {userCoins && (
            <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-xl relative group">
              <button 
                className="absolute top-2 right-2 text-amber-600 hover:text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={refreshCoins}
                title="Refresh coin data"
              >
                <RefreshCw size={16} />
              </button>
              
              <Coins className="h-8 w-8 text-amber-500 mr-3" />
              <div>
                <p className="text-sm text-amber-700">Current Balance</p>
                <p className="text-2xl font-bold text-amber-900">
                  {formatCoins(userCoins.balance)}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <Tabs defaultValue="subscription" className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="subscription">
              <CreditCard className="h-4 w-4 mr-2" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <History className="h-4 w-4 mr-2" />
              Transaction History
            </TabsTrigger>
            <TabsTrigger value="usage">
              <TrendingUp className="h-4 w-4 mr-2" />
              Usage Guide
            </TabsTrigger>
          </TabsList>
          
          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => {
                const isCurrent = key === currentTier;
                return (
                  <Card 
                    key={key} 
                    className={`overflow-hidden ${isCurrent ? 'border-amber-500 ring-2 ring-amber-500 shadow-lg' : ''}`}
                  >
                    {isCurrent && (
                      <div className="bg-amber-500 py-1 text-white text-center text-sm font-medium">
                        Current Plan
                      </div>
                    )}
                    <CardHeader className={isCurrent ? 'pb-4' : 'pb-6'}>
                      <CardTitle>{tier.name}</CardTitle>
                      <CardDescription>
                        {tier.monthlyCoins} coins per month
                      </CardDescription>
                      <div className="mt-4">
                        <span className="text-3xl font-bold">
                          {tier.price === 0 ? 'Free' : `$${tier.price}`}
                        </span>
                        {tier.price > 0 && <span className="text-sm text-gray-500"> / month</span>}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-6">
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                          <span className="text-sm">
                            {tier.monthlyCoins} coins refreshed monthly
                          </span>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                          <span className="text-sm">
                            Download {Math.floor(tier.monthlyCoins / 2)} subtitle files
                          </span>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                          <span className="text-sm">
                            Process {Math.floor(tier.monthlyCoins / 3)} translations
                          </span>
                        </li>
                        {tier.price >= 9.99 && (
                          <li className="flex items-start">
                            <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                            <span className="text-sm">
                              Priority customer support
                            </span>
                          </li>
                        )}
                        {tier.price >= 19.99 && (
                          <li className="flex items-start">
                            <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                            <span className="text-sm">
                              Batch processing priority
                            </span>
                          </li>
                        )}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full"
                        variant={isCurrent ? "outline" : "default"}
                        disabled={isCurrent || processingPurchase}
                        onClick={() => handleSubscribe(key as keyof typeof SUBSCRIPTION_TIERS)}
                      >
                        {processingPurchase ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : isCurrent ? (
                          'Current Plan'
                        ) : (
                          'Subscribe'
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
            
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Subscription Information</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Your subscription automatically renews each month. You can change or cancel your plan at any time.
                    Coins are refreshed at the beginning of each billing cycle.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Transaction History Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    Your coin transaction history for the last 30 days
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={refreshCoins} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {userCoins?.transactionHistory && userCoins.transactionHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-left py-3 px-4 font-medium">Type</th>
                          <th className="text-left py-3 px-4 font-medium">Description</th>
                          <th className="text-right py-3 px-4 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userCoins.transactionHistory
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map(transaction => (
                            <tr key={transaction.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm">
                                {new Date(transaction.timestamp).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <span className={`inline-block px-2 py-1 rounded text-xs ${
                                  transaction.type === 'EARNED' 
                                    ? 'bg-green-100 text-green-800' 
                                    : transaction.type === 'SPENT'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {transaction.type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm">{transaction.description}</td>
                              <td className="py-3 px-4 text-right font-medium">
                                <span className={transaction.type === 'EARNED' ? 'text-green-600' : 'text-red-600'}>
                                  {transaction.type === 'EARNED' ? '+' : '-'}{transaction.amount}
                                </span>
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions yet</h3>
                    <p className="text-gray-500">Your transaction history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Usage Guide Tab */}
          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle>How to Use Your Coins</CardTitle>
                <CardDescription>
                  Learn how to make the most of your FetchSub coins
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 border rounded-lg">
                    <div className="rounded-full bg-green-100 p-3 w-12 h-12 flex items-center justify-center mb-4">
                      <Zap className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Single Downloads</h3>
                    <p className="text-gray-600 text-sm">
                      Each single subtitle download costs <strong>1 coin</strong>. You can
                      download subtitles in any available format.
                    </p>
                  </div>
                  
                  <div className="p-6 border rounded-lg">
                    <div className="rounded-full bg-blue-100 p-3 w-12 h-12 flex items-center justify-center mb-4">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 15l3-3m0 0l3 3m-3-3v6M7 8h.01M11 8h.01M15 8h.01" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">Batch Processing</h3>
                    <p className="text-gray-600 text-sm">
                      When processing multiple URLs at once, each subtitle costs <strong>2 coins</strong>.
                      This helps optimize our systems for bulk processing.
                    </p>
                  </div>
                  
                  <div className="p-6 border rounded-lg">
                    <div className="rounded-full bg-purple-100 p-3 w-12 h-12 flex items-center justify-center mb-4">
                      <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">Translations</h3>
                    <p className="text-gray-600 text-sm">
                      Automatic translation of subtitles costs an additional <strong>3 coins</strong> per
                      subtitle due to the processing required.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <h3 className="font-medium text-amber-900 mb-2">Coin Refreshes</h3>
                  <p className="text-sm text-amber-700">
                    Your coins are refreshed monthly based on your subscription plan:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-700">
                    <li>• Free: 50 coins per month</li>
                    <li>• Basic: 200 coins per month</li>
                    <li>• Standard: 500 coins per month</li>
                    <li>• Premium: 1000 coins per month</li>
                  </ul>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="font-medium text-blue-900 mb-2">Tips to Maximize Your Coins</h3>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-blue-500 mr-2 shrink-0" />
                      <span>Use batch processing only when necessary, as it costs more per subtitle</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-blue-500 mr-2 shrink-0" />
                      <span>Only request translations when you need them to save coins</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-blue-500 mr-2 shrink-0" />
                      <span>Consider upgrading your subscription if you regularly use more coins</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

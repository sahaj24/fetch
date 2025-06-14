"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { addSubscriptionCoins } from "@/utils/coinUtils";
import { supabase } from "@/supabase/config";

// Define PayPal on window object for TypeScript
declare global {
  interface Window {
    paypal: any;
  }
}
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, HelpCircle, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import CheckoutView from "@/components/checkout/CheckoutView";

interface PricingFeature {
  name: string;
  included: boolean;
  tooltip?: string;
}

interface PricingPlan {
  name: string;
  description: string;
  monthlyCoins: number;
  monthlyUsd: number;
  features: PricingFeature[];
  buttonText: string;
  popular?: boolean;
}

export default function Page() {
  // PayPal configuration constants from environment variables
  const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "ATKi8kjOWlRBVCGdeAIeMslERAQ2q-u6h3XMCtmqWKIMPYv26yKKTcJpXgYrmiI1GWw80hIlioRrZTIW";
  // Secret key is stored in environment but only used on server-side
  const PAYPAL_URL = process.env.PAYPAL_URL || "https://api.sandbox.paypal.com";
  const PAYPAL_MODE = process.env.NEXT_PUBLIC_PAYPAL_MODE || "sandbox";
  
  // State variables for PayPal integration and modal
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paypalInitialized, setPaypalInitialized] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<PricingPlan | null>(null);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [updatedCoinBalance, setUpdatedCoinBalance] = useState<number | null>(null);
  
  // Check URL parameters for plan selection after login redirect
  useEffect(() => {
    // Check if we have URL parameters indicating a redirect from login
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const planParam = urlParams.get('plan');
      
      if (planParam) {
        // Find the plan in our pricing plans
        const plan = pricingPlans.find(p => p.name === planParam);
        if (plan && plan.name !== 'Free') {
          // Set the selected plan and open the modal
          setSelectedPlan(plan.name);
          setSelectedPlanDetails(plan);
          setModalOpen(true);
          
          // Clean up the URL parameters
          const url = new URL(window.location.href);
          url.searchParams.delete('plan');
          window.history.replaceState({}, '', url);
        }
      }
    }
  }, []);
  
  // Use the working PayPal subscription plan ID provided
  const SUBSCRIPTION_PLAN_IDS = {
    Pro: "P-9TY72104PT817263KNA5N6FY", // Working plan ID 
    Enterprise: "P-9TY72104PT817263KNA5N6FY" // Using same plan ID for now
  };
  
  const pricingPlans: PricingPlan[] = [
    {
      name: "Free",
      description: "For occasional subtitle downloads",
      monthlyCoins: 50,
      monthlyUsd: 0,
      features: [
        { name: "Free plan ($0/month)", included: true },
        { name: "All subtitle formats", included: true },
        { name: "Full language support", included: true },
        { name: "Manual downloads only", included: true },
        { name: "Standard processing speed", included: true },
        { name: "Email support", included: false },
        { name: "Batch processing", included: false },
      ],
      buttonText: "Get Started",
    },
    {
      name: "Pro",
      description: "For regular content creators",
      monthlyCoins: 750,
      monthlyUsd: 9.99,
      features: [
        { name: "Pro plan ($9.99/month)", included: true },
        { name: "All subtitle formats", included: true },
        { name: "Full language support", included: true },
        { name: "Batch downloads", included: true },
        { name: "Priority processing", included: true },
        { name: "Email support", included: true },
        { name: "Batch processing", included: true },
      ],
      buttonText: "Subscribe",
      popular: true,
    },
    {
      name: "Enterprise",
      description: "For teams and businesses",
      monthlyCoins: 2500,
      monthlyUsd: 29.9,
      features: [
        { name: "Enterprise plan ($29.90/month)", included: true },
        { name: "All subtitle formats", included: true },
        { name: "Full language support", included: true },
        { name: "Batch downloads", included: true },
        { name: "Priority processing", included: true },
        { name: "Priority support", included: true },
        { name: "Batch processing", included: true },
      ],
      buttonText: "Contact Sales",
    },
  ];

  // Initialize PayPal button when script loads
  // Debug mode - set to true to see helpful information about subscription plans
  const DEBUG_MODE = true;

  const initializePayPal = () => {
    // Prevent re-initialization if already done for this plan
    if (paypalInitialized) {
      return;
    }
    
    if (!window.paypal) {
      const errorMsg = "PayPal SDK not loaded yet. Please try again in a moment.";
      console.error(errorMsg);
      setPaypalError(errorMsg);
      return;
    }
    
    const buttonContainer = document.getElementById(`paypal-button-${selectedPlan}`);
    if (!selectedPlan || !buttonContainer) {
      const errorMsg = "Button container not found in DOM.";
      console.error(errorMsg);
      setPaypalError(errorMsg);
      return;
    }

    try {

      // Clear any existing buttons in the container
      buttonContainer.innerHTML = '';
      
      const planId = SUBSCRIPTION_PLAN_IDS[selectedPlan as keyof typeof SUBSCRIPTION_PLAN_IDS];
      if (!planId) {
        throw new Error(`No plan ID found for ${selectedPlan}`);
      }

      // In debug mode, show a message about the plan ID
      if (DEBUG_MODE) {
      }
      
      const buttons = window.paypal.Buttons({
        style: {
          shape: "rect",
          color: "blue",
          layout: "vertical",
          label: "subscribe",
          height: 45,
          // Make the button look nicer in the modal
          tagline: false,
        },
        createSubscription: (data: any, actions: any) => {
          
          return actions.subscription.create({
            plan_id: planId,
            application_context: {
              shipping_preference: "NO_SHIPPING",
              user_action: "SUBSCRIBE_NOW",
            },
          });
        },
        onApprove: async (data: any, actions: any) => {
          setSubscriptionId(data.subscriptionID);
          
          // Get the current user
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;
          
          if (userId && selectedPlanDetails) {
            // Add the subscription coins to the user's balance
            const success = await addSubscriptionCoins(
              userId,
              selectedPlanDetails.name,
              selectedPlanDetails.monthlyCoins
            );
            
            if (success) {
              
              // Get the updated coin balance to display to the user
              const { data: userData } = await supabase
                .from('user_coins')
                .select('balance')
                .eq('user_id', userId)
                .single();
              
              if (userData) {
                setUpdatedCoinBalance(userData.balance);
              }
            } else {
              console.error('Failed to add subscription coins to user balance');
              // Continue anyway to show success message
            }
          } else {
            console.error('Cannot add subscription coins: Missing user ID or plan details');
          }
          
          setSubscriptionSuccess(true);
          return actions.subscription.get();
        },
        onError: (err: any) => {
          console.error("PayPal error:", err);
          const errorMsg = err.message || 'Unknown error';
          
          // Special handling for the "RESOURCE_NOT_FOUND" error
          if (errorMsg.includes("RESOURCE_NOT_FOUND") || err?.name === "RESOURCE_NOT_FOUND") {
            setPaypalError(
              `The subscription plan ID for ${selectedPlan} plan doesn't exist. ` +
              `Please create a plan in your PayPal dashboard and update your .env.local file.`
            );
          } else {
            setPaypalError(`PayPal error: ${errorMsg}`);
          }
        },
        onCancel: (data: any) => {
          setSelectedPlan(null);
        },
      });
      
      if (!buttons.isEligible()) {
        console.error("PayPal Buttons are not eligible");
        setPaypalError("PayPal integration not available. Please try a different payment method.");
        return;
      }
      
      buttons.render(`#paypal-button-${selectedPlan}`);
      setPaypalInitialized(true);
    } catch (error: any) {
      console.error("PayPal button initialization error:", error);
      setPaypalError(`PayPal initialization error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSubscribe = (planName: string) => {
    if (planName === "Free") {
      window.location.href = "/register";
    } else if (planName === "Pro" || planName === "Enterprise") {
      // Find the selected plan details
      const plan = pricingPlans.find(p => p.name === planName);
      
      if (plan) {
        // Reset paypal errors and initialized state
        setPaypalError(null);
        setPaypalInitialized(false);
        setSelectedPlan(planName);
        setSelectedPlanDetails(plan);
        
        // Open the subscription modal
        setModalOpen(true);
      }
    } else {
      // For custom plans
      window.location.href = "/contact";
    }
  };

  // Initialize PayPal when modal is opened with selected plan
  // Initialize PayPal when conditions are met
  useEffect(() => {
    if (modalOpen && selectedPlan && paypalLoaded && !paypalInitialized) {
      const timer = setTimeout(() => {
        initializePayPal();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [modalOpen, selectedPlan, paypalLoaded, paypalInitialized]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-12 bg-background">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that's right for you. All plans include access to
            our core subtitle extraction features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col ${plan.popular ? "border-primary shadow-lg" : ""}`}
            >
              {plan.popular && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium rounded-t-lg">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <p className="text-muted-foreground">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    ${plan.monthlyUsd === 0 ? "0" : plan.monthlyUsd.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    USD / month
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span
                        className={`mr-2 rounded-full p-1 ${feature.included ? "text-green-500" : "text-muted-foreground"}`}
                      >
                        {feature.included ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span className="h-4 w-4 block"></span>
                        )}
                      </span>
                      <span
                        className={`${!feature.included ? "text-muted-foreground" : ""}`}
                      >
                        {feature.name}
                      </span>
                      {feature.tooltip && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{feature.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.name === "Free" ? (
                  <Button
                    onClick={() => handleSubscribe(plan.name)}
                    className="w-full"
                    variant="outline"
                  >
                    {plan.buttonText}
                  </Button>
                ) : plan.name === "Pro" || plan.name === "Enterprise" ? (
                  <Button
                    onClick={() => handleSubscribe(plan.name)}
                    className={`w-full ${plan.popular ? "bg-primary hover:bg-primary/90" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.buttonText}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(plan.name)}
                    className="w-full"
                    variant="outline"
                  >
                    {plan.buttonText}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Custom Plan Card */}
        <div className="flex justify-center">
          <Card className="flex flex-col w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Custom</CardTitle>
              <p className="text-muted-foreground">For specialized needs</p>
              <div className="mt-4">
                <span className="text-2xl font-bold">Custom Pricing</span>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="mb-4">Need more coins or special features?</p>
              <p>Contact us for a custom plan tailored to your specific requirements.</p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => window.location.href = "/contact"}
                className="w-full"
                variant="outline"
              >
                Contact Us
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Can I upgrade or downgrade my plan?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Yes, you can change your plan at any time. Changes will be
                  applied at the start of your next billing cycle.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  What payment methods do you accept?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We accept all major credit cards and PayPal for payment.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Is there a limit to how many subtitles I can download?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Each plan provides a different level of service at different price points. Free users pay $0/month,
                  Pro users pay $9.99/month, and Enterprise users pay $29.90/month.
                  The price is based on the features and extraction volume you need.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Are all subtitle formats available on all plans?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Yes, all plans including the Free plan have access to all subtitle formats and full language support.
                  The difference between plans is primarily the number of coins provided each month.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="text-center text-sm text-muted-foreground">
          <p>
            {new Date().getFullYear()} FetchSub.com - YouTube Subtitle
            Downloader
          </p>
        </footer>
      </div>
      
      {/* Subscription Modal Dialog */}
      <Dialog 
        open={modalOpen} 
        onOpenChange={(open) => {
          // Reset success state when closing modal
          if (!open) {
            setSubscriptionSuccess(false);
            setSubscriptionId(null);
          }
          setModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {subscriptionSuccess ? (
            // Success View
            <>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <DialogTitle className="text-xl font-bold text-center">
                  Subscription Successful!
                </DialogTitle>
                <div className="mt-4 text-center space-y-2">
                  <p className="text-muted-foreground">
                    Thank you for subscribing to our {selectedPlanDetails?.name} plan.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your subscription ID is: <span className="font-mono bg-muted px-2 py-1 rounded text-xs">{subscriptionId}</span>
                  </p>
                  
                  {/* Show the coin update information */}
                  <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                    <p className="text-lg font-semibold text-primary">
                      {selectedPlanDetails?.monthlyCoins} coins added to your account!
                    </p>
                    {updatedCoinBalance !== null && (
                      <p className="text-sm mt-1">
                        Your new balance: <span className="font-bold">{updatedCoinBalance} coins</span>
                      </p>
                    )}
                  </div>
                  
                  <p className="mt-4 text-sm">
                    You will be charged ${selectedPlanDetails?.monthlyUsd} monthly for {selectedPlanDetails?.monthlyCoins} coins.
                  </p>
                </div>
              </div>
              <DialogFooter className="sm:justify-center">
                <Button 
                  onClick={() => {
                    setModalOpen(false);
                    // Could redirect to dashboard or account page
                  }}
                  className="mt-4"
                >
                  Continue to Dashboard
                </Button>
              </DialogFooter>
            </>
          ) : (
            // Checkout View using the CheckoutView component
            <CheckoutView
              selectedPlan={selectedPlan}
              selectedPlanDetails={selectedPlanDetails}
              paypalError={paypalError}
              onClose={() => setModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* PayPal Subscription Script */}
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription&currency=USD&components=buttons,funding-eligibility&commit=true&debug=true`}
        data-sdk-integration-source="button-factory"
        strategy="lazyOnload"
        onLoad={() => {
          setPaypalLoaded(true);
        }}
        onError={(e) => {
          console.error("PayPal SDK failed to load:", e);
          setPaypalError("Failed to load PayPal. Please refresh the page and try again.");
        }}
      />
    </main>
  );
}
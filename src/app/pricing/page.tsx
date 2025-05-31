"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

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
  // Access authentication state
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
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
  
  // Initialize stored plan from localStorage on component mount
  useEffect(() => {
    console.log('Auth state changed. User:', user ? 'Logged in' : 'Not logged in');
    
    // Only proceed if the user is logged in and not in the loading state
    if (typeof window !== 'undefined' && user && !isLoading) {
      try {
        const storedData = localStorage.getItem('selectedPlanBeforeLogin');
        console.log('Checking localStorage for plan data:', storedData);
        
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log('Parsed plan data:', parsedData);
          
          // Make sure the data is recent (within the last 5 minutes)
          const now = new Date().getTime();
          const fiveMinutesAgo = now - (5 * 60 * 1000);
          
          if (parsedData.timestamp && parsedData.timestamp > fiveMinutesAgo) {
            const planName = parsedData.plan;
            console.log('Found valid stored plan after login:', planName);
            
            // Find the plan details
            const planDetails = pricingPlans.find(p => p.name === planName);
            if (planDetails) {
              console.log('Opening modal with plan:', planName);
              
              // Set timeout to ensure all rendering is complete
              setTimeout(() => {
                setSelectedPlan(planName);
                setSelectedPlanDetails(planDetails);
                setModalOpen(true);
              }, 500);
              
              // Clear it after opening modal
              localStorage.removeItem('selectedPlanBeforeLogin');
            }
          } else {
            console.log('Stored plan data is too old, ignoring');
            localStorage.removeItem('selectedPlanBeforeLogin');
          }
        }
      } catch (error) {
        console.error('Error parsing stored plan data:', error);
        localStorage.removeItem('selectedPlanBeforeLogin');
      }
    }
  }, [user, pricingPlans, isLoading]);

  // Initialize PayPal button when script loads
  // Debug mode - set to true to see helpful information about subscription plans
  const DEBUG_MODE = true;

  const initializePayPal = () => {
    console.log('initializePayPal called');
    
    // Make sure user is logged in
    if (!user) {
      const errorMsg = "You must be logged in to subscribe. Please log in and try again.";
      console.error(errorMsg);
      setPaypalError(errorMsg);
      return;
    }
    
    // Check if PayPal SDK is loaded
    if (typeof window === 'undefined' || !window.paypal) {
      const errorMsg = "PayPal SDK not loaded yet. Please try again in a moment.";
      console.error(errorMsg);
      setPaypalError(errorMsg);
      return;
    }
    
    // Find the container for the button
    const buttonContainerId = `paypal-button-${selectedPlan}`;
    console.log('Looking for button container:', buttonContainerId);
    const buttonContainer = document.getElementById(buttonContainerId);
    
    if (!selectedPlan || !buttonContainer) {
      const errorMsg = `Button container '${buttonContainerId}' not found in DOM.`;
      console.error(errorMsg);
      setPaypalError(errorMsg);
      return;
    }

    try {
      console.log(`PayPal SDK loaded, initializing button for ${selectedPlan} plan...`);

      // Clear any existing buttons in the container
      buttonContainer.innerHTML = '';
      
      const planId = SUBSCRIPTION_PLAN_IDS[selectedPlan as keyof typeof SUBSCRIPTION_PLAN_IDS];
      if (!planId) {
        throw new Error(`No plan ID found for ${selectedPlan}`);
      }

      // In debug mode, show a message about the plan ID
      if (DEBUG_MODE) {
        console.log(`Using plan ID: ${planId} for ${selectedPlan} plan`);
        console.log('PayPal client ID:', PAYPAL_CLIENT_ID);
      }
      
      // Create the PayPal buttons
      const buttons = window.paypal.Buttons({
        style: {
          shape: "rect",
          color: "black",
          layout: "vertical",
          label: "subscribe",
          tagline: false
        },
        createSubscription: (data: any, actions: any) => {
          console.log(`Creating ${selectedPlan} subscription with plan ID: ${planId}`);
          
          return actions.subscription.create({
            plan_id: planId,
            application_context: {
              shipping_preference: "NO_SHIPPING",
              user_action: "SUBSCRIBE_NOW",
            },
          });
        },
        onApprove: (data: any, actions: any) => {
          console.log("Subscription approved:", data);
          // Update state to show success message in modal
          setSubscriptionId(data.subscriptionID);
          setSubscriptionSuccess(true);
          return actions.redirect(); // Will be handled by our modal now
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
          console.log("Subscription cancelled:", data);
          setSelectedPlan(null);
        },
      });
      
      // Render the PayPal button in the container
      buttons.render(buttonContainer).then(() => {
        // Mark as initialized
        setPaypalInitialized(true);
        setPaypalError(null);
        console.log('PayPal buttons rendered successfully!');
      }).catch((error: any) => {
        console.error('PayPal button render error:', error);
        setPaypalError('Failed to render PayPal button. Please try again.');
      });
    } catch (error: any) {
      console.error('PayPal initialization error:', error);
      setPaypalError(`Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSubscribe = (planName: string) => {
    console.log(`Subscribe button clicked for ${planName} plan`);
    
    if (planName === "Free") {
      window.location.href = "/auth/register";
    } else if (planName === "Pro" || planName === "Enterprise") {
      // Check if user is logged in
      if (!user) {
        console.log('User not logged in, redirecting to login');
        // Redirect to login page with callback URL
        router.push(`/auth/login?callbackUrl=${encodeURIComponent('/pricing')}`);
        return;
      }
      
      console.log('User is logged in, opening modal directly');
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

  // No special handling needed after login - user will need to click subscribe again
  
  // Initialize PayPal when modal opens and script is loaded
  useEffect(() => {
    // Only try to initialize PayPal if modal is open, script is loaded, and button isn't already initialized
    if (modalOpen && selectedPlan && paypalLoaded && !paypalInitialized && user) {
      console.log('Modal is open and PayPal SDK is loaded, initializing PayPal button');
      // Clear the initialized flag first in case we need to retry
      setPaypalInitialized(false);
      
      // Add a small delay to make sure the modal DOM is fully rendered
      const timer = setTimeout(() => {
        console.log('Initializing PayPal button now...');
        initializePayPal();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [modalOpen, selectedPlan, paypalLoaded, paypalInitialized, user]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-12 bg-background">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Choose the plan that's right for you. All plans include access to
          </p>
          
          {/* Temporary debug button - REMOVE AFTER TESTING */}
          {user && (
            <div className="mb-8 flex justify-center gap-4">
              <Button 
                onClick={() => {
                  const plan = pricingPlans.find(p => p.name === "Pro");
                  if (plan) {
                    setSelectedPlan("Pro");
                    setSelectedPlanDetails(plan);
                    setModalOpen(true);
                    console.log("Force opening Pro plan modal");
                  }
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Test Pro Plan Modal
              </Button>
              <Button 
                onClick={() => {
                  const plan = pricingPlans.find(p => p.name === "Enterprise");
                  if (plan) {
                    setSelectedPlan("Enterprise");
                    setSelectedPlanDetails(plan);
                    setModalOpen(true);
                    console.log("Force opening Enterprise plan modal");
                  }
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                Test Enterprise Plan Modal
              </Button>
            </div>
          )}
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our core subtitle extraction features.
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
            // Checkout View
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {selectedPlanDetails ? `Subscribe to ${selectedPlanDetails.name} Plan` : "Subscribe"}
                </DialogTitle>
                <DialogDescription>
                  {selectedPlanDetails && (
                    <div className="mt-2 space-y-2">
                      <p className="font-medium text-foreground">
                        {selectedPlanDetails.description}
                      </p>
                      <p className="text-lg font-bold text-primary">
                        ${selectedPlanDetails.monthlyUsd}/month
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPlanDetails.monthlyCoins} coins per month
                      </p>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col space-y-4 p-2">
                {/* PayPal Button Container */}
                {!user ? (
                  <div className="bg-white p-6 rounded-lg text-center space-y-4">
                    <p className="text-sm">You need to be logged in to subscribe to a plan.</p>
                    <Button 
                      onClick={() => {
                        console.log('Login button clicked in modal');
                        // Simply redirect to login with callback to pricing page
                        router.push(`/auth/login?callbackUrl=${encodeURIComponent('/pricing')}`);
                      }}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      Log in to Continue
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Don't have an account? <a href="/auth/register" className="text-primary hover:underline">Register</a>
                    </p>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-lg">
                    {/* PayPal button container with increased height */}
                    <div 
                      id={`paypal-button-${selectedPlan}`} 
                      className="rounded-md mx-auto min-h-[150px] border border-gray-200 flex justify-center items-center"
                    >
                      {!paypalLoaded && (
                        <div className="text-center">
                          <p>Loading PayPal...</p>
                        </div>
                      )}
                    </div>
                    {paypalError && (
                      <div className="text-red-500 text-sm text-center mt-2">
                        {paypalError}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-center text-muted-foreground px-2">
                  By subscribing, you agree to our Terms of Service and Privacy Policy.
                  You can cancel your subscription at any time from your account settings.
                </p>
              </div>
              <DialogFooter className="sm:justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setModalOpen(false)}
                  className="mt-2"
                >
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* PayPal Subscription Script - load only when needed */}
      {modalOpen && user && (
        <Script
          src={`https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription&currency=USD`}
          strategy="afterInteractive"
          onLoad={() => {
            console.log('PayPal script loaded successfully');
            setPaypalLoaded(true);
            // Initialize immediately after loading
            setTimeout(() => {
              initializePayPal();
            }, 500);
          }}
          onError={(e) => {
            console.error('Failed to load PayPal script:', e);
            setPaypalError('Failed to load PayPal payment system. Please try again later.');
          }}
        />
      )}
    </main>
  );
}

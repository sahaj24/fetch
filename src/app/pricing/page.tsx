"use client";

import { useState, useEffect, useRef } from "react";
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
  
  // PayPal configuration constants
  const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "ATKi8kjOWlRBVCGdeAIeMslERAQ2q-u6h3XMCtmqWKIMPYv26yKKTcJpXgYrmiI1GWw80hIlioRrZTIW";
  const PLAN_ID = "P-9TY72104PT817263KNA5N6FY"; // Working plan ID for both Pro and Enterprise
  
  // State variables for PayPal integration and modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<PricingPlan | null>(null);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  
  // Create a ref to track if PayPal has been loaded
  const paypalLoaded = useRef(false);
  
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

  // Helper function to render PayPal buttons directly when needed
  const renderPayPalButtons = (containerId: string) => {
    console.log('Rendering PayPal buttons directly');
    
    // Check for required variables
    if (!selectedPlan || !user) {
      console.error('Missing required data for PayPal');
      setPaypalError('Missing required data for PayPal button');
      return;
    }
    
    // Make sure PayPal SDK is loaded
    if (typeof window === 'undefined' || !window.paypal) {
      console.error('PayPal SDK not loaded');
      setPaypalError('PayPal is not available. Please refresh the page.');
      return;
    }
    
    // Get container
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`PayPal container not found: ${containerId}`);
      setPaypalError('Button container not found. Please try again.');
      return;
    }
    
    // Clear any existing content
    container.innerHTML = '';
    
    try {
      console.log(`Creating PayPal button for ${selectedPlan} plan with ID: ${PLAN_ID}`);
      
      // Create the button with minimal options
      window.paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'black',
          layout: 'vertical',
          label: 'subscribe'
        },
        
        // Create subscription with hard-coded plan ID
        createSubscription: function(data: any, actions: any) {
          return actions.subscription.create({
            'plan_id': PLAN_ID
          });
        },
        
        // Handle subscription approval
        onApprove: function(data: any) {
          console.log('Subscription successful!', data);
          setModalOpen(false);
          alert(`You've successfully subscribed to the ${selectedPlan} plan!`);
        },
        
        // Handle errors
        onError: function(err: any) {
          console.error('PayPal error:', err);
          setPaypalError('There was a problem with the payment. Please try again.');
        }
      }).render(container);
      
    } catch (error: any) {
      console.error('PayPal render error:', error);
      setPaypalError(`Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSubscribe = (planName: string) => {
    console.log(`Subscribe button clicked for ${planName} plan`);
    
    if (planName === "Free") {
      window.location.href = "/auth/register";
      return;
    }
    
    if (planName === "Pro" || planName === "Enterprise") {
      // Find the selected plan details
      const plan = pricingPlans.find(p => p.name === planName);
      
      if (plan) {
        // Reset any errors
        setPaypalError(null);
        
        // Set the selected plan
        setSelectedPlan(planName);
        setSelectedPlanDetails(plan);
        
        // Open the subscription modal
        setModalOpen(true);
        
        // We'll render the PayPal buttons when the modal opens
        console.log('Opening subscription modal for', planName);
      }
      return;
    }
    
    // For custom plans
    window.location.href = "/contact";
  };

  // No special handling needed after login - user will need to click subscribe again
  
  // This effect runs when the modal opens to load the PayPal script and render buttons
  useEffect(() => {
    if (modalOpen && selectedPlan && user) {
      console.log('Modal opened - loading PayPal script');
      
      // Load the PayPal script dynamically
      const loadPayPalScript = () => {
        const paypalScriptId = 'paypal-sdk-script';
        
        // Remove existing script if any
        const existingScript = document.getElementById(paypalScriptId);
        if (existingScript) {
          existingScript.remove();
        }
        
        // Create a new script element
        const script = document.createElement('script');
        script.id = paypalScriptId;
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription&currency=USD`;
        script.async = true;
        
        // When script loads, render the buttons
        script.onload = () => {
          console.log('PayPal script loaded, rendering buttons');
          // Render buttons with a small delay to ensure DOM is ready
          setTimeout(() => {
            renderPayPalButtons('paypal-button-container');
          }, 500);
        };
        
        script.onerror = () => {
          console.error('Failed to load PayPal script');
          setPaypalError('Failed to load PayPal. Please refresh and try again.');
        };
        
        // Add the script to the document
        document.body.appendChild(script);
      };
      
      // Load the script immediately
      loadPayPalScript();
      
      // Cleanup function
      return () => {
        const script = document.getElementById('paypal-sdk-script');
        if (script) {
          script.remove();
        }
      };
    }
  }, [modalOpen, selectedPlan, user]);

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
                onClick={() => {
                  console.log('Debug: Opening Pro subscription modal');
                  handleSubscribe('Pro');
                }}
              >
                Open Pro Modal
              </button>
              <button 
                className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm"
                onClick={() => {
                  console.log('Debug: Opening Enterprise subscription modal');
                  handleSubscribe('Enterprise');
                }}
              >
                Open Enterprise Modal
              </button>
            </div>
          </div>
          
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
                    onClick={() => {
                      // Check if user is logged in before subscribing
                      if (!user) {
                        // Not logged in - redirect to login page
                        router.push(`/auth/login?callbackUrl=${encodeURIComponent('/pricing')}`);
                      } else {
                        // User is logged in - proceed with subscription
                        handleSubscribe(plan.name);
                      }
                    }}
                    className={`w-full ${plan.popular ? "bg-primary hover:bg-primary/90" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {!user ? "Login to Subscribe" : plan.buttonText}
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
                    {/* Simple single PayPal button container */}
                    <div id="paypal-button-container" className="rounded-md mx-auto min-h-[150px]">
                      {!paypalLoaded && (
                        <div className="flex justify-center items-center h-[150px] border border-gray-200">
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

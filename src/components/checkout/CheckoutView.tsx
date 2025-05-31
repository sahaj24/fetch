"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/supabase/config";

interface CheckoutViewProps {
  selectedPlan: string | null;
  selectedPlanDetails: {
    name: string;
    description: string;
    monthlyUsd: number;
    monthlyCoins: number;
  } | null;
  paypalError: string | null;
  onClose: () => void;
}

export default function CheckoutView({
  selectedPlan,
  selectedPlanDetails,
  paypalError,
  onClose,
}: CheckoutViewProps) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = useState<string>("");

  useEffect(() => {
    // Create the redirect URL with plan information
    if (selectedPlan) {
      const currentUrl = window.location.pathname;
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(currentUrl)}&plan=${encodeURIComponent(selectedPlan)}`;
      setRedirectUrl(redirectUrl);
    }
  }, [selectedPlan]);
  
  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setIsLoading(false);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // If still loading auth state, show loading indicator
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="h-8 w-8 rounded-full border-4 border-t-primary animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  // If user is not authenticated, show login prompt
  if (!user) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Authentication Required
          </DialogTitle>
          <DialogDescription>
            <div className="mt-2 space-y-2">
              <p className="font-medium text-foreground">
                You need to be logged in to subscribe to the {selectedPlanDetails?.name} Plan.
              </p>
              {selectedPlanDetails && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="font-medium">{selectedPlanDetails.description}</p>
                  <p className="text-lg font-bold text-primary mt-1">
                    ${selectedPlanDetails.monthlyUsd}/month
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlanDetails.monthlyCoins} coins per month
                  </p>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 p-4">
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => router.push(redirectUrl)}
              className="w-full"
            >
              Log in to Continue
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push(`/auth/signup?redirect=${encodeURIComponent(window.location.pathname)}&plan=${encodeURIComponent(selectedPlan || '')}`)}
              className="w-full"
            >
              Sign up for an Account
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground px-2 mt-2">
            You'll be redirected back to complete your subscription after logging in.
          </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="mt-2"
          >
            Cancel
          </Button>
        </DialogFooter>
      </>
    );
  }

  // If user is authenticated, show the checkout view
  return (
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
        <div className="bg-white p-4 rounded-lg">
          <div 
            id={`paypal-button-${selectedPlan}`} 
            className="rounded-md overflow-hidden mx-auto"
          />
          {paypalError && (
            <div className="text-red-500 text-sm text-center mt-2">
              {paypalError}
            </div>
          )}
        </div>
        <p className="text-xs text-center text-muted-foreground px-2">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          You can cancel your subscription at any time from your account settings.
        </p>
      </div>
      <DialogFooter className="sm:justify-center">
        <Button 
          variant="outline" 
          onClick={onClose}
          className="mt-2"
        >
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
}

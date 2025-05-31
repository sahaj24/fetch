"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

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
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";
  const router = useRouter();
  const [authError, setAuthError] = useState(false);
  
  // Check for authentication status and redirect if not authenticated
  useEffect(() => {
    // Don't do anything while authentication is being checked
    if (isLoading) return;
    
    // Only redirect if definitely not authenticated
    if (status === "unauthenticated") {
      setAuthError(true);
      // Add a slight delay before redirecting to show the error message
      const redirectTimer = setTimeout(() => {
        router.push(`/auth/login?plan=${selectedPlan}&redirect=${encodeURIComponent("/pricing")}`);
        onClose(); // Close the modal
      }, 1500);
      return () => clearTimeout(redirectTimer);
    }
  }, [status, selectedPlan, router, onClose, isLoading]);
  
  // Show authentication error if user is not logged in
  if (authError) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-red-500 flex items-center gap-2">
            <AlertCircle size={18} />
            Authentication Required
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 text-center">
          <p className="mb-4">You need to be logged in to subscribe to a plan.</p>
          <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
        </div>
      </>
    );
  }
  
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

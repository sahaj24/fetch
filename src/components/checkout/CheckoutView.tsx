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
  const { data: session } = useSession();
  const router = useRouter();
  
  // Simplified authentication check - directly check for session
  const isAuthenticated = !!session;
  
  // Log for debugging
  console.log("CheckoutView authentication:", { isAuthenticated, hasSession: !!session });
  
  // Only show the login requirement message if not authenticated
  // No automatic redirects from this component to prevent loops
  if (!isAuthenticated) {
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
          <div className="mt-4 flex justify-center gap-2">
            <Button 
              onClick={() => router.push(`/auth/login?plan=${selectedPlan}&redirect=${encodeURIComponent("/pricing")}`)}>
              Log In
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}>
              Cancel
            </Button>
          </div>
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

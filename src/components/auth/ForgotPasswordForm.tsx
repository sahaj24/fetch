"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MailIcon } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { sendPasswordResetEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await sendPasswordResetEmail(email);
      if (!result.success) {
        throw new Error(result.error || 'Failed to send reset email');
      }
      
      setSuccess('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      // Handle specific Supabase error codes
      const errorMessage = err.message || 'Failed to send reset email';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
        <CardDescription className="text-center">
          Enter your email and we'll send you a password reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="name@fetchsub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
                disabled={isLoading}
              />
              <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mt-4 bg-green-50 text-green-800 border-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-black hover:bg-black/90 text-white" 
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <div className="text-center w-full text-sm">
          Remembered your password?{" "}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Back to login
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

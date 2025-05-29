"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/supabase/config";
import { toast, Toaster } from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast.success("Password reset link sent to your email");
    } catch (error: any) {
      setError(error.message || "Failed to send password reset email");
      toast.error(error.message || "Failed to send password reset email");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="mt-2 text-gray-600">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-md">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {isSuccess ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-medium">Check your email</h2>
              <p className="mt-2 text-gray-600">
                We've sent a password reset link to {email}
              </p>
              <div className="mt-6">
                <Link
                  href="/auth/login"
                  className="inline-block w-full rounded-md bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Send Reset Link"}
                </button>
              </div>

              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

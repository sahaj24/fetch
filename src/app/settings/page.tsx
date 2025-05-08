"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/config";
import { signOutUser } from "@/app/auth/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, saveUserSession } from "@/app/auth/utils";
import { toast, Toaster } from "react-hot-toast";
import { AlertCircle, Loader2, Save } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // User profile form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load user data and preferences
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const authUser = session.user;
        
        // Get user profile
        const userData = getCurrentUser() || {};
        setUser({
          uid: authUser.id,
          email: authUser.email,
          displayName: authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'User',
          photoURL: authUser.user_metadata?.avatar_url
        });
        
        // Set form fields
        setDisplayName(authUser.user_metadata?.display_name || "");
        setEmail(authUser.email || "");
      } else {
        // Redirect to login if not authenticated
        router.push("/auth/login?callbackUrl=/settings");
      }
      setLoading(false);
    };
    
    loadUserData();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push("/auth/login?callbackUrl=/settings");
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Update user profile
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    
    try {
      // Get current user session
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user;
      
      if (!currentUser) {
        throw new Error("No authenticated user found");
      }
      
      // Update display name
      if (displayName !== currentUser.user_metadata?.display_name) {
        const { error } = await supabase.auth.updateUser({
          data: { display_name: displayName }
        });
        
        if (error) throw error;
        
        // Also update in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ display_name: displayName })
          .eq('id', currentUser.id);
          
        if (profileError) throw profileError;
        
        // Update local session data
        const updatedUser = { ...currentUser, user_metadata: { ...currentUser.user_metadata, display_name: displayName } };
        saveUserSession(updatedUser);
        
        setSuccess("Profile updated successfully");
        toast.success("Profile updated successfully");
      }
      
      // Update user email (requires password verification)
      if (email !== currentUser.email && currentPassword) {
        try {
          // First verify the current password
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email!,
            password: currentPassword
          });
          
          if (signInError) throw new Error("Current password is incorrect");
          
          // Then update email
          const { error } = await supabase.auth.updateUser({ email });
          
          if (error) throw error;
          
          saveUserSession(currentUser);
          setSuccess("Email update initiated. Check your new email inbox to confirm the change.");
          toast.success("Email update initiated. Check your new email inbox to confirm the change.");
          setCurrentPassword("");
        } catch (err: any) {
          setError(err.message || "Current password is incorrect");
          toast.error("Current password is incorrect");
          setSaving(false);
          return;
        }
      }
      
      // Update user password
      if (newPassword && confirmPassword && currentPassword) {
        if (newPassword !== confirmPassword) {
          setError("New passwords do not match");
          toast.error("New passwords do not match");
          setSaving(false);
          return;
        }
        
        try {
          // First verify the current password
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email!,
            password: currentPassword
          });
          
          if (signInError) throw new Error("Current password is incorrect");
          
          // Then update password
          const { error } = await supabase.auth.updateUser({ 
            password: newPassword 
          });
          
          if (error) throw error;
          
          setSuccess("Password updated successfully");
          toast.success("Password updated successfully");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        } catch (err: any) {
          setError(err.message || "Failed to update password");
          toast.error("Failed to update password");
          setSaving(false);
          return;
        }
      }
      
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Handle account deletion
  const handleAccountDeletion = () => {
    const confirm = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    
    if (confirm) {
      toast.error("This functionality is coming soon.", {
        duration: 5000,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <Toaster position="top-right" />
      
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
        <p className="text-gray-500 mb-8">Manage your account settings and preferences</p>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleProfileUpdate}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                    <p className="text-sm text-gray-500">
                      You'll need to enter your current password to change your email
                    </p>
                  </div>
                  
                  {email !== user?.email && (
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Required to change email"
                        required={email !== user?.email}
                      />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-5">
                  <Button variant="outline" type="button" onClick={() => router.push("/")}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage your password and account security
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleProfileUpdate}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPasswordSecurity">Current Password</Label>
                    <Input
                      id="currentPasswordSecurity"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      required={newPassword !== "" || confirmPassword !== ""}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                      <span className="text-red-700 text-sm">{error}</span>
                    </div>
                  )}
                  
                  {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-700 text-sm">{success}</span>
                    </div>
                  )}
                  
                  <hr />
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
                    <p className="text-sm text-gray-500">
                      Once you delete your account, there is no going back. This action cannot be undone.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t pt-5">
                  <Button 
                    variant="destructive" 
                    type="button"
                    onClick={handleAccountDeletion}
                  >
                    Delete Account
                  </Button>
                  
                  <Button type="submit" disabled={saving || (!newPassword && !confirmPassword)}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

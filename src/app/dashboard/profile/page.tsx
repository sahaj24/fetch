import { Metadata } from "next";
import UserProfile from "@/components/UserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Profile | Fetch",
  description: "Manage your profile",
};

export default function ProfilePage() {
  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <UserProfile />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
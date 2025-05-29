"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/supabase/config";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CreateTestHistoryPage() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const { data, error } = await supabase.from("history").insert([
        {
          title,
          url,
          content,
          user_id: "test-user", // In a real app, use the actual user ID
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setMessage("Test history entry created successfully!");
      setTitle("");
      setUrl("");
      setContent("");
    } catch (error) {
      console.error("Error creating test history:", error);
      setMessage("Failed to create test history entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Test History Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/video"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Extracted content goes here"
                rows={6}
                required
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Test Entry"}
            </Button>

            {message && (
              <p className="mt-4 p-2 bg-green-50 text-green-700 rounded">
                {message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
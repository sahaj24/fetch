"use client";

import { useEffect, useState } from "react";
import { getUserHistory, HistoryItem, deleteHistoryItem, clearAllHistory } from "./utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Loader2, Trash2, TrashIcon, PencilIcon, InfoIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { supabase } from "@/supabase/config";

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check authentication status with Supabase
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session?.user);
        
        if (session?.user) {
          loadHistory();
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Setup auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      
      if (session?.user) {
        loadHistory();
      } else {
        setHistory([]);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const historyItems = await getUserHistory(50);
      setHistory(historyItems);
    } catch (error) {
      console.error("Error loading history:", error);
      toast({
        title: "Error",
        description: "Failed to load history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteItem = async (id: string) => {
    try {
      const success = await deleteHistoryItem(id);
      if (success) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        toast({
          title: "Deleted",
          description: "History item deleted successfully",
        });
      } else {
        throw new Error("Failed to delete item");
      }
    } catch (error) {
      console.error("Error deleting history item:", error);
      toast({
        title: "Error",
        description: "Failed to delete history item",
        variant: "destructive",
      });
    }
  };
  
  const handleClearHistory = async () => {
    setIsDeleting(true);
    try {
      const success = await clearAllHistory();
      if (success) {
        setHistory([]);
        toast({
          title: "Cleared",
          description: "History cleared successfully",
        });
      } else {
        throw new Error("Failed to clear history");
      }
    } catch (error) {
      console.error("Error clearing history:", error);
      toast({
        title: "Error",
        description: "Failed to clear history",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const filteredHistory = activeTab === "all" 
    ? history 
    : history.filter(item => item.type === activeTab);
    
  const renderHistoryContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
          <p className="mt-2 text-gray-500">Loading history...</p>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <div className="text-center py-10">
          <InfoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">Not logged in</h3>
          <p className="mt-1 text-gray-500">Please log in to view your history</p>
          <Button className="mt-4" asChild>
            <Link href="/auth/login">Log In</Link>
          </Button>
        </div>
      );
    }
    
    if (history.length === 0) {
      return (
        <div className="text-center py-10">
          <InfoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No history yet</h3>
          <p className="mt-1 text-gray-500">Your activity history will appear here</p>
        </div>
      );
    }
    
    if (filteredHistory.length === 0) {
      return (
        <div className="text-center py-10">
          <InfoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No items in this category</h3>
          <p className="mt-1 text-gray-500">Try a different category or check back later</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {filteredHistory.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>
                    {format(new Date(item.created_at), 'PPP p')}
                    <Badge variant="outline" className="ml-2">
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Badge>
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-gray-500 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="bg-gray-50 rounded p-2 mb-2">
                <p className="font-medium text-sm text-gray-700">Prompt:</p>
                <p className="text-gray-600">{item.prompt}</p>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-700">Response:</p>
                <p className="text-gray-600 line-clamp-3">{item.response}</p>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 p-4 flex justify-end">
              <Button variant="outline" asChild>
                <Link href={`/history/${item.id}`}>
                  <PencilIcon className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  const typeCounts = history.reduce((acc: Record<string, number>, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">History</h1>
        {history.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all your history items.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearHistory}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      
      <Separator className="my-6" />
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6">
          <TabsList>
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">
                {history.length}
              </Badge>
            </TabsTrigger>
            {Object.entries(typeCounts).map(([type, count]) => (
              <TabsTrigger key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        <TabsContent value={activeTab}>
          {renderHistoryContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

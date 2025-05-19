"use client";

import React, { useState, useEffect } from "react";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { X, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "./ui/card";

interface ProcessVisualizationProps {
  progress?: number;
  totalVideos?: number;
  processedVideos?: number;
  estimatedTimeRemaining?: string;
  status?: "idle" | "processing" | "completed" | "error";
  onCancel?: () => void;
}

const ProcessVisualization = ({
  progress = 0,
  totalVideos = 0,
  processedVideos = 0,
  estimatedTimeRemaining = "--:--",
  status = "idle",
  onCancel = () => {},
}: ProcessVisualizationProps) => {
  const [isVisible, setIsVisible] = useState(status !== "idle");
  const [progressAnimation, setProgressAnimation] = useState(0);

  // Animate progress bar to smooth transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgressAnimation(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  if (!isVisible) return null;

  const statusIcons = {
    idle: <Clock className="h-5 w-5 text-muted-foreground" />,
    processing: <Loader2 className="h-5 w-5 text-black animate-spin" />,
    completed: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
  };

  const statusMessages = {
    idle: "Ready to process",
    processing: `Processing videos`,
    completed: "Processing completed",
    error: "Error occurred during processing",
  };

  const getProgressColor = () => {
    if (status === "completed") return "bg-green-500";
    if (status === "error") return "bg-red-500";
    return "bg-black";
  };

  const statusMessage = statusMessages[status];
  const statusIcon = statusIcons[status];

  return (
    <Card className="w-full border-black/5 shadow-sm bg-white/80 backdrop-blur-sm animate-fade-in overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {statusIcon}
              <div>
                <h3 className="font-medium">{statusMessage}</h3>
                {status === "processing" && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Estimated time remaining: {estimatedTimeRemaining}
                  </p>
                )}
              </div>
            </div>
            {status === "processing" && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="h-9 gap-1 border-black/10 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            )}
          </div>

          <div className="space-y-3 mt-2">
            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full ${getProgressColor()} rounded-full transition-all duration-300 ease-out`}
                style={{ width: `${progressAnimation}%` }}
              />
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="font-medium">{Math.round(progress)}% complete</span>
              {status === "processing" && totalVideos > 0 && (
                <div className="flex items-center gap-1.5 bg-black/5 px-2.5 py-1 rounded-full text-sm">
                  <span className="font-medium">{processedVideos}</span>
                  <span className="text-muted-foreground">of</span>
                  <span className="font-medium">{totalVideos}</span>
                  <span className="text-muted-foreground">videos processed</span>
                </div>
              )}
            </div>
          </div>
          
          {status === "processing" && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-center h-1.5">
                  <div 
                    className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" 
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessVisualization;

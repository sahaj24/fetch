import React, { useEffect, useState } from 'react';

interface ProcessingMessagesProps {
  processingCount: number;
  totalCount: number;
  isProcessing: boolean;
}

const ALL_MESSAGES = [
  // First message appears after 45 seconds
  "Stay calm, we're processing your files...",
  // These appear one by one, every 45 seconds
  "This might take a few minutes for large batches...",
  "This might take a few minutes for large batches..",
  "Processing subtitles takes time for the best quality...",
  "We're working hard to extract your subtitles...",
  "Larger playlists or CSV files need more processing time...",
  "Grab a cup of coffee while we handle this...",
  "The subtitles are being carefully extracted...",
  "Still working on those subtitles...",
  "Converting YouTube videos to text...",
  "Getting closer to completion...",
  "Parsing and formatting the subtitles...",
  "Almost there, just a bit more time needed...",
  "Ensuring high-quality subtitle extraction...",
  "Your patience will be rewarded with perfect subtitles...",
  "Finalizing the subtitle processing...",
  "We're making good progress on your batch...",
  "Processing complex videos takes extra time...",
  "Working through your videos one by one..."
];

export function ProcessingMessages({ processingCount, totalCount, isProcessing }: ProcessingMessagesProps) {
  // Start with no message
  const [currentMessage, setCurrentMessage] = useState<string>("");
  
  useEffect(() => {
    if (!isProcessing) {
      setCurrentMessage(""); // Clear message when not processing
      return;
    }
    
    // Array of timeouts to clear on cleanup
    const timeouts: NodeJS.Timeout[] = [];
    
    // Schedule each message to appear, one every 45 seconds, replacing the previous one
    ALL_MESSAGES.forEach((message, index) => {
      // First message after 45 seconds, then one every 45 seconds after that
      const delay = 45000 * (index + 1);
      
      const timeout = setTimeout(() => {
        setCurrentMessage(message); // Replace previous message
      }, delay);
      
      timeouts.push(timeout);
    });
    
    // Cleanup function to clear all timeouts if component unmounts or isProcessing changes
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [isProcessing]); // Only re-run this effect if isProcessing changes
  
  // Don't render anything if not processing, if processing is complete, or if no message yet
  if (!isProcessing || processingCount >= totalCount || !currentMessage) {
    return null;
  }
  
  return (
    <div className="my-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="text-center text-lg text-gray-600 dark:text-gray-300">
        {currentMessage}
      </div>
    </div>
  );
}

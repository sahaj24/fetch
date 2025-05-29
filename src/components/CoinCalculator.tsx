"use client";

import { useState, useEffect } from "react";
import { formatCoins } from "@/app/coins/utils";
import { OPERATION_COSTS } from "@/app/coins/utils";
import { Coins, Calculator } from "lucide-react";

interface CoinCalculatorProps {
  videoCount: number;
  formatCount: number;
  isPlaylist: boolean;
}

export function CoinCalculator({
  videoCount = 1, 
  formatCount = 1,
  isPlaylist = false
}: CoinCalculatorProps) {
  const [totalCost, setTotalCost] = useState(0);
  
  // Calculate cost whenever inputs change
  useEffect(() => {
    // Base cost calculation
    let cost = 0;
    
    // For multiple videos (either playlist or CSV), use batch cost
    if (isPlaylist || videoCount > 1) {
      cost = videoCount * formatCount * OPERATION_COSTS.BATCH_SUBTITLE;
    } else {
      // For single video, use single cost
      cost = formatCount * OPERATION_COSTS.SINGLE_SUBTITLE;
    }
    
    // Minimum cost is 1 coin
    setTotalCost(Math.max(cost, 1));
  }, [videoCount, formatCount, isPlaylist]);

  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator size={18} className="text-amber-600" />
        <h3 className="font-medium text-amber-800">Cost Calculator</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div className="text-amber-700">Videos:</div>
        <div className="font-medium text-right">{videoCount}</div>
        
        <div className="text-amber-700">Formats:</div>
        <div className="font-medium text-right">{formatCount}</div>
        
        <div className="text-amber-700 font-semibold pt-2 border-t border-amber-200 mt-1">Estimated Cost:</div>
        <div className="font-bold text-right text-amber-900 pt-2 border-t border-amber-200 mt-1">
          {formatCoins(totalCost)}
        </div>
      </div>
      
      <div className="flex items-center gap-2 bg-white rounded p-2 text-xs text-amber-800">
        <Coins size={14} className="text-amber-500" />
        <span>Cost updates automatically as you change options</span>
      </div>
    </div>
  );
}
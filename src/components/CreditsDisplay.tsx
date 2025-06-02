import React, { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Coins } from 'lucide-react';

interface CreditsDisplayProps {
  credits: number;
  mode: 'FREEPLAY' | 'PAID';
}

export const CreditsDisplay: React.FC<CreditsDisplayProps> = ({ credits, mode }) => {
  const [highlight, setHighlight] = useState(false);
  
  // Create a highlight effect when credits change
  useEffect(() => {
    if (credits > 0) {
      setHighlight(true);
      const timer = setTimeout(() => {
        setHighlight(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [credits]);
  
  if (mode === 'FREEPLAY') {
    return null;
  }
  
  return (
    <Card className={`fixed top-4 right-4 z-50 p-3 bg-black/60 shadow-lg border-2 border-yellow-400 ${
      highlight ? 'border-yellow-300 animate-pulse' : 'border-amber-900'
    } rounded-lg transition-all duration-300`}>
      <div className="flex items-center gap-2">
        <Coins className="text-yellow-300 h-6 w-6" />
        <div className="flex flex-col">
          <p className="text-white text-sm font-bold">CREDITS</p>
          <Badge className="bg-yellow-300 text-amber-900 text-lg font-bold">
            {credits}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

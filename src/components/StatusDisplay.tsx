
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface StatusDisplayProps {
  currentlyPlaying: string;
  mode: 'FREEPLAY' | 'PAID';
  credits: number;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({
  currentlyPlaying,
  mode,
  credits
}) => {
  return (
    <>
      {/* Now Playing Ticker - Top Left */}
      <div className="absolute top-4 left-4 z-20">
        <Card className="bg-amber-900/90 border-amber-600 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="text-amber-100 font-bold text-lg w-[48rem] truncate">
              Now Playing: {currentlyPlaying}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credits - Top Right */}
      <div className="flex justify-end mb-8">
        <Card className="bg-amber-900/90 border-amber-600 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-amber-100 font-bold text-xl">
              CREDIT: {mode === 'FREEPLAY' ? 'Free Play' : credits}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

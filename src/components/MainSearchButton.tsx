
import React from 'react';
import { Button } from "@/components/ui/button";

interface MainSearchButtonProps {
  onSearchClick: () => void;
}

export const MainSearchButton: React.FC<MainSearchButtonProps> = ({
  onSearchClick
}) => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Button
        onClick={onSearchClick}
        className="w-96 h-24 text-3xl font-bold bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-amber-900 shadow-2xl transform hover:scale-105 transition-all duration-200 border-4 border-amber-500"
        style={{ filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))' }}
      >
        🎵 Search for Music 🎵
      </Button>
    </div>
  );
};

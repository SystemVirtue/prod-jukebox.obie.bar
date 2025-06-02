
import React from 'react';

interface ComingUpTickerProps {
  upcomingTitles: string[];
}

export const ComingUpTicker: React.FC<ComingUpTickerProps> = ({
  upcomingTitles
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-amber-200 py-2 overflow-hidden">
      <div className="whitespace-nowrap animate-marquee">
        <span className="text-lg font-bold">COMING UP: </span>
        {upcomingTitles.map((title, index) => (
          <span key={index} className="mx-8 text-lg">
            {index + 1}. {title}
          </span>
        ))}
      </div>
    </div>
  );
};

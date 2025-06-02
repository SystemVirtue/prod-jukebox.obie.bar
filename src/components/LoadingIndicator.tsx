import React from 'react';

interface LoadingIndicatorProps {
  isVisible: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <img 
        src="/backgrounds/Obie_Shield_BOUNCING_.gif" 
        alt="Loading" 
        className="w-64 h-64"
      />
    </div>
  );
};

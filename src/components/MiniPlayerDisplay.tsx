
import React from 'react';

interface MiniPlayerDisplayProps {
  showMiniPlayer: boolean;
  currentVideoId: string;
}

export const MiniPlayerDisplay: React.FC<MiniPlayerDisplayProps> = ({
  showMiniPlayer,
  currentVideoId
}) => {
  if (!showMiniPlayer || !currentVideoId) {
    return null;
  }

  return (
    <div className="flex justify-center mb-8">
      <div className="relative w-48 h-27 rounded-lg overflow-hidden shadow-2xl">
        {/* Vignette overlay for feathered edges */}
        <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_30px_10px_rgba(0,0,0,0.6)] z-10 pointer-events-none"></div>
        <iframe
          src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1`}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={{ pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
};

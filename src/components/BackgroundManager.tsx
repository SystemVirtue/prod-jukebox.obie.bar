
import React, { useRef, useEffect } from 'react';

interface BackgroundFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
}

interface BackgroundManagerProps {
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  cycleBackgrounds: boolean;
  backgroundCycleIndex: number;
  onBackgroundCycleIndexChange: (index: number) => void;
  onSelectedBackgroundChange: (id: string) => void;
}

export const useBackgroundManager = ({
  backgrounds,
  selectedBackground,
  cycleBackgrounds,
  backgroundCycleIndex,
  onBackgroundCycleIndexChange,
  onSelectedBackgroundChange
}: BackgroundManagerProps) => {
  const cycleIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (cycleBackgrounds && backgrounds.length > 1) {
      const validBackgrounds = backgrounds.filter(bg => bg.id !== 'default');
      if (validBackgrounds.length > 0) {
        cycleIntervalRef.current = setInterval(() => {
          const nextIndex = (backgroundCycleIndex + 1) % validBackgrounds.length;
          const nextBackground = validBackgrounds[nextIndex];
          onBackgroundCycleIndexChange(nextIndex);
          onSelectedBackgroundChange(nextBackground.id);
        }, 25000);
      }
    } else {
      if (cycleIntervalRef.current) {
        clearInterval(cycleIntervalRef.current);
      }
    }

    return () => {
      if (cycleIntervalRef.current) {
        clearInterval(cycleIntervalRef.current);
      }
    };
  }, [cycleBackgrounds, backgrounds, backgroundCycleIndex]);

  const getCurrentBackground = () => {
    return backgrounds.find(bg => bg.id === selectedBackground) || backgrounds[0];
  };

  return { getCurrentBackground };
};

export const BackgroundDisplay: React.FC<{
  background: BackgroundFile;
}> = ({ background }) => {
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);

  return (
    <>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{ 
          backgroundImage: background.type === 'image' ? `url('${background.url}')` : 'none',
          backgroundSize: 'cover'
        }}
      >
        {background.type === 'video' && (
          <video
            ref={backgroundVideoRef}
            autoPlay
            loop
            muted
            className="absolute inset-0 w-full h-full object-cover"
            src={background.url}
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40" />
      </div>
    </>
  );
};

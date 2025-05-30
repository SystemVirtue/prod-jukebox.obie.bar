
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
  bounceVideos: boolean;
  onBackgroundCycleIndexChange: (index: number) => void;
  onSelectedBackgroundChange: (id: string) => void;
}

export const useBackgroundManager = ({
  backgrounds,
  selectedBackground,
  cycleBackgrounds,
  backgroundCycleIndex,
  bounceVideos,
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
  bounceVideos: boolean;
  children: React.ReactNode;
}> = ({ background, bounceVideos, children }) => {
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video || background.type !== 'video' || !bounceVideos) return;

    let direction = 1; // 1 for forward, -1 for backward

    const handleTimeUpdate = () => {
      if (direction === 1 && video.currentTime >= video.duration - 0.1) {
        // Reached end, start playing backward
        direction = -1;
        video.pause();
        
        const playBackward = () => {
          if (video.currentTime <= 0.1) {
            // Reached beginning, start playing forward again
            direction = 1;
            video.play();
            return;
          }
          video.currentTime -= 0.1;
          requestAnimationFrame(playBackward);
        };
        playBackward();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [background, bounceVideos]);

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
            loop={!bounceVideos}
            muted
            className="absolute inset-0 w-full h-full object-cover"
            src={background.url}
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        {children}
      </div>
    </>
  );
};

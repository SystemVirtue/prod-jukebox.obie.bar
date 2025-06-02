
import { useEffect, useCallback, useRef } from 'react';
import { JukeboxState } from './useJukeboxState';

interface UseStorageEventHandlerProps {
  state: JukeboxState;
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>;
  handleVideoEnded: () => void;
  addLog: (type: 'SONG_PLAYED' | 'USER_SELECTION' | 'CREDIT_ADDED' | 'CREDIT_REMOVED', description: string, videoId?: string, creditAmount?: number) => void;
}

export const useStorageEventHandler = ({
  state,
  setState,
  handleVideoEnded,
  addLog
}: UseStorageEventHandlerProps) => {
  // Use refs to store latest values for the storage event handler
  const stateRef = useRef(state);
  const handleVideoEndedRef = useRef(handleVideoEnded);

  // Update refs whenever values change
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    handleVideoEndedRef.current = handleVideoEnded;
  }, [handleVideoEnded]);

  // Enhanced storage event handler with better debugging
  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === 'jukeboxStatus' && event.newValue) {
      const status = JSON.parse(event.newValue);
      const currentState = stateRef.current;
      console.log('[StorageEvent] Parsed status:', status);
      console.log('[StorageEvent] Current video ID in state:', currentState.currentVideoId);
      
      // Update currently playing based on player window communication
      if (status.status === 'playing' && status.title) {
        setState(prev => ({ 
          ...prev, 
          currentlyPlaying: status.title.replace(/\([^)]*\)/g, '').trim(),
          currentVideoId: status.videoId || prev.currentVideoId
        }));
      }
      
      // Handle video ended - check priority queue first
      if (status.status === 'ended') {
        const statusVideoId = status.id;
        console.log('[StorageEvent] Video ended. Status video ID:', statusVideoId);
        console.log('[StorageEvent] Current state video ID:', currentState.currentVideoId);
        
        if (statusVideoId && statusVideoId === currentState.currentVideoId) {
          console.log('[StorageEvent] Video IDs match, processing end event');
          setState(prev => ({ 
            ...prev, 
            currentlyPlaying: 'Loading...',
            currentVideoId: ''
          }));
          
          // Use timeout to ensure state update completes before playing next song
          setTimeout(() => {
            console.log('[StorageEvent] Triggering handleVideoEnded');
            handleVideoEndedRef.current();
          }, 100);
        } else {
          console.log('[StorageEvent] Video ID mismatch, ignoring end event');
        }
      }
      
      if (status.status === 'fadeComplete') {
        const statusVideoId = status.id;
        console.log('[StorageEvent] Fade complete. Status video ID:', statusVideoId);
        
        if (statusVideoId && statusVideoId === currentState.currentVideoId) {
          console.log('[StorageEvent] Fade complete for current video, processing');
          setState(prev => ({ 
            ...prev, 
            currentlyPlaying: 'Loading...',
            currentVideoId: ''
          }));
          
          setTimeout(() => {
            console.log('[StorageEvent] Triggering handleVideoEnded after fade');
            handleVideoEndedRef.current();
          }, 100);
        }
      }
      
      // Handle video unavailable/error - auto-skip with enhanced sync
      if (status.status === 'error' || status.status === 'unavailable') {
        const statusVideoId = status.id;
        console.log('[StorageEvent] Video error/unavailable. Status video ID:', statusVideoId);
        
        if (statusVideoId && statusVideoId === currentState.currentVideoId) {
          console.log('[StorageEvent] Auto-skipping unavailable video');
          addLog('SONG_PLAYED', `Auto-skipping unavailable video: ${currentState.currentlyPlaying}`);
          setState(prev => ({ 
            ...prev, 
            currentlyPlaying: 'Loading...',
            currentVideoId: ''
          }));
          
          setTimeout(() => {
            console.log('[StorageEvent] Triggering handleVideoEnded after error');
            handleVideoEndedRef.current();
          }, 1500);
        }
      }

      // Handle player ready status
      if (status.status === 'ready') {
        console.log("[StorageEvent] Player window ready.");
      }
    }
    
    // Listen for player window commands to track what's playing
    if (event.key === 'jukeboxCommand' && event.newValue) {
      const command = JSON.parse(event.newValue);
      if (command.action === 'play' && command.title && command.videoId) {
        console.log('[StorageEvent] Play command detected:', command.videoId, command.title);
        setState(prev => ({ 
          ...prev, 
          currentlyPlaying: command.title.replace(/\([^)]*\)/g, '').trim(),
          currentVideoId: command.videoId
        }));
      }
    }
  }, [setState, addLog]);

  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [handleStorageChange]);
};

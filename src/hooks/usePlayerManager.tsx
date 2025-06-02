
import { useToast } from "@/hooks/use-toast";
import { JukeboxState, LogEntry } from "./useJukeboxState";

export const usePlayerManager = (
  state: JukeboxState,
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>,
  addLog: (type: LogEntry['type'], description: string, videoId?: string, creditAmount?: number) => void
) => {
  const { toast } = useToast();

  const initializePlayer = () => {
    if (state.playerWindow && !state.playerWindow.closed) {
      console.log('Player window already exists');
      return;
    }

    const playerWindow = window.open('/player.html', 'JukeboxPlayer', 
      'width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no');
    
    if (playerWindow) {
      setState(prev => ({ ...prev, playerWindow, isPlayerRunning: true }));
      console.log('Player window opened successfully');
    } else {
      toast({
        title: "Error",
        description: "Failed to open player window. Please allow popups.",
        variant: "destructive"
      });
    }
  };

  const playSong = (videoId: string, title: string, artist: string, logType: 'SONG_PLAYED' | 'USER_SELECTION') => {
    if (state.playerWindow && !state.playerWindow.closed) {
      const command = {
        action: 'play',
        videoId: videoId,
        title: title,
        artist: artist,
        timestamp: Date.now()
      };
      
      try {
        state.playerWindow.localStorage.setItem('jukeboxCommand', JSON.stringify(command));
        setState(prev => ({ 
          ...prev, 
          currentlyPlaying: title.replace(/\([^)]*\)/g, '').trim(),
          currentVideoId: videoId
        }));
        
        const description = logType === 'USER_SELECTION' ? 
          `Playing user request: ${title}` : 
          `Autoplay: ${title}`;
        addLog(logType, description, videoId);
      } catch (error) {
        console.error('Error sending command to player:', error);
      }
    }
  };

  const handlePlayerToggle = () => {
    if (!state.playerWindow || state.playerWindow.closed) {
      console.log('Player window is closed, reopening...');
      initializePlayer();
      
      // Start playing the first song in the playlist after a short delay
      setTimeout(() => {
        if (state.inMemoryPlaylist.length > 0) {
          const firstSong = state.inMemoryPlaylist[0];
          playSong(firstSong.videoId, firstSong.title, firstSong.channelTitle, 'SONG_PLAYED');
        }
      }, 2000);
      
      addLog('SONG_PLAYED', 'Player window reopened and started');
      return;
    }

    if (state.isPlayerRunning && !state.isPlayerPaused) {
      // Pause player
      if (state.playerWindow && !state.playerWindow.closed) {
        const command = { action: 'pause' };
        try {
          state.playerWindow.localStorage.setItem('jukeboxCommand', JSON.stringify(command));
          addLog('SONG_PLAYED', 'Player paused by admin');
        } catch (error) {
          console.error('Error sending pause command:', error);
        }
      }
      setState(prev => ({ ...prev, isPlayerPaused: true }));
    } else if (state.isPlayerRunning && state.isPlayerPaused) {
      // Resume player
      if (state.playerWindow && !state.playerWindow.closed) {
        const command = { action: 'play' };
        try {
          state.playerWindow.localStorage.setItem('jukeboxCommand', JSON.stringify(command));
          addLog('SONG_PLAYED', 'Player resumed by admin');
        } catch (error) {
          console.error('Error sending play command:', error);
        }
      }
      setState(prev => ({ ...prev, isPlayerPaused: false }));
    } else {
      // Start player
      setState(prev => ({ ...prev, isPlayerRunning: true, isPlayerPaused: false }));
      if (state.inMemoryPlaylist.length > 0) {
        const firstSong = state.inMemoryPlaylist[0];
        playSong(firstSong.videoId, firstSong.title, firstSong.channelTitle, 'SONG_PLAYED');
      }
      addLog('SONG_PLAYED', 'Player started by admin');
    }
  };

  const handleSkipSong = () => {
    const isUserRequest = state.userRequests.some(req => req.title === state.currentlyPlaying);
    if (isUserRequest) {
      setState(prev => ({ ...prev, showSkipConfirmation: true }));
    } else {
      performSkip();
    }
  };

  const performSkip = () => {
    if (state.playerWindow && !state.playerWindow.closed) {
      const command = { action: 'fadeOutAndBlack', fadeDuration: 3000 };
      try {
        state.playerWindow.localStorage.setItem('jukeboxCommand', JSON.stringify(command));
        addLog('SONG_PLAYED', `SKIPPING: ${state.currentlyPlaying}`);
      } catch (error) {
        console.error('Error sending skip command:', error);
      }
    }
    setState(prev => ({ ...prev, showSkipConfirmation: false }));
  };

  return {
    initializePlayer,
    playSong,
    handlePlayerToggle,
    handleSkipSong,
    performSkip
  };
};

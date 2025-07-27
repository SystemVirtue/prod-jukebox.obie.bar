
import * as React from 'react';
import { JukeboxState, PlaylistItem, LogEntry } from "./useJukeboxState";

export const usePlaylistManager = (
  state: JukeboxState,
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>,
  addLog: (type: LogEntry['type'], description: string, videoId?: string, creditAmount?: number) => void,
  playSong: (videoId: string, title: string, artist: string, logType: 'SONG_PLAYED' | 'USER_SELECTION') => void,
  toast: any
) => {
  const isProcessingNextSong = React.useRef(false);
  
  const loadPlaylistVideos = async (playlistId: string) => {
    try {
      let allVideos: PlaylistItem[] = [];
      let nextPageToken = '';
      
      // Load ALL videos without any limits
      do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${state.apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Failed to load playlist');
        
        const data = await response.json();
        const videos: PlaylistItem[] = data.items
          .filter((item: any) => {
            // Filter out private/unavailable videos
            return item.snippet.title !== 'Private video' && 
                   item.snippet.title !== 'Deleted video' && 
                   item.snippet.title !== '[Private video]' &&
                   item.snippet.title !== '[Deleted video]' &&
                   item.snippet.resourceId?.videoId;
          })
          .map((item: any) => ({
            id: item.id,
            title: item.snippet.title.replace(/\([^)]*\)/g, '').trim(),
            channelTitle: item.snippet.channelTitle,
            videoId: item.snippet.resourceId.videoId
          }));
        
        allVideos = [...allVideos, ...videos];
        nextPageToken = data.nextPageToken || '';
        
        console.log(`[LoadPlaylist] Loaded ${videos.length} videos this batch, total so far: ${allVideos.length}`);
      } while (nextPageToken);

      // Shuffle playlist ONCE after loading
      const shuffled = shuffleArray(allVideos);
      setState(prev => ({ 
        ...prev, 
        defaultPlaylistVideos: allVideos, // keep original for reference
        inMemoryPlaylist: [...shuffled], // shuffle for playback
        currentVideoIndex: 0
      }));
      
      console.log(`[LoadPlaylist] Loaded ALL ${allVideos.length} videos from playlist (shuffled order)`);
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast({
        title: "Playlist Error",
        description: "Failed to load default playlist",
        variant: "destructive"
      });
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const playNextSong = () => {
    const timestamp = new Date().toISOString();
    console.log(`[PlayNext][${timestamp}] playNextSong called - checking if already processing...`);
    
    // Prevent multiple concurrent executions
    if (isProcessingNextSong.current) {
      console.warn(`[PlayNext][${timestamp}] Already processing next song, ignoring duplicate call`);
      return;
    }
    
    isProcessingNextSong.current = true;
    console.log(`[PlayNext][${timestamp}] Starting song selection process`);
    console.log(`[PlayNext][${timestamp}] Priority queue length: ${state.priorityQueue.length}`);
    console.log(`[PlayNext][${timestamp}] In-memory playlist length: ${state.inMemoryPlaylist.length}`);
  
    try {
      // Always check priority queue first
      if (state.priorityQueue.length > 0) {
        const nextRequest = state.priorityQueue[0];
        console.log(`[PlayNext][${timestamp}] Playing next song from priority queue: "${nextRequest.title}" (${nextRequest.videoId})`);
        
        // Update state first
        setState(prev => ({ 
          ...prev, 
          priorityQueue: prev.priorityQueue.slice(1) 
        }));
        
        // Then play the song
        playSong(nextRequest.videoId, nextRequest.title, nextRequest.channelTitle, 'USER_SELECTION');
        return;
      }
      
      // Play from in-memory playlist - SEQUENTIAL ORDER
      if (state.inMemoryPlaylist.length > 0) {
        const nextVideo = state.inMemoryPlaylist[0];
        console.log(`[PlayNext][${timestamp}] Playing next song from in-memory playlist: "${nextVideo.title}" (${nextVideo.videoId})`);
        
        // Move played song to end of playlist (circular playlist)
        setState(prev => ({ 
          ...prev, 
          inMemoryPlaylist: [...prev.inMemoryPlaylist.slice(1), nextVideo]
        }));
        
        // Then play the song
        playSong(nextVideo.videoId, nextVideo.title, nextVideo.channelTitle, 'SONG_PLAYED');
      } else {
        console.warn(`[PlayNext][${timestamp}] No songs available in playlist or priority queue!`);
      }
    } catch (error) {
      console.error(`[PlayNext][${timestamp}] Error in playNextSong:`, error);
    } finally {
      // Reset the processing flag after a short delay to ensure state updates complete
      setTimeout(() => {
        console.log(`[PlayNext][${new Date().toISOString()}] Resetting processing flag after operation`);
        isProcessingNextSong.current = false;
      }, 1000);
    }
  };

  const handleVideoEnded = () => {
    const timestamp = new Date().toISOString();
    console.log(`[VideoEnded][${timestamp}] Video ended, triggering playNextSong...`);
    playNextSong();
    
    // Reset the processing flag after a short delay to allow state updates to complete
    setTimeout(() => {
      console.log(`[VideoEnded][${timestamp}] Resetting processing flag`);
      isProcessingNextSong.current = false;
    }, 1000); // 1 second delay to ensure state updates complete
  };

  const handleDefaultPlaylistChange = (playlistId: string) => {
    setState(prev => ({ ...prev, defaultPlaylist: playlistId }));
    loadPlaylistVideos(playlistId);
  };

  const handlePlaylistReorder = (newPlaylist: PlaylistItem[]) => {
    setState(prev => ({ ...prev, inMemoryPlaylist: newPlaylist }));
  };

  const handlePlaylistShuffle = () => {
    console.log('[Shuffle] Manual shuffle requested by user');
    // Don't shuffle if currently playing - only shuffle the remaining playlist
    const currentSong = state.inMemoryPlaylist.find(song => song.title === state.currentlyPlaying);
    const remainingPlaylist = state.inMemoryPlaylist.filter(song => song.title !== state.currentlyPlaying);
    const shuffledRemaining = shuffleArray(remainingPlaylist);
    
    // If there's a current song, keep it at the front
    const newPlaylist = currentSong ? [currentSong, ...shuffledRemaining] : shuffledRemaining;
    
    setState(prev => ({ ...prev, inMemoryPlaylist: newPlaylist }));
    addLog('SONG_PLAYED', 'Playlist shuffled by admin (excluding current song)');
    toast({
      title: "Playlist Shuffled",
      description: "The playlist order has been randomized (current song unchanged)",
    });
  };

  return {
    loadPlaylistVideos,
    playNextSong,
    handleVideoEnded,
    handleDefaultPlaylistChange,
    handlePlaylistReorder,
    handlePlaylistShuffle
  };
};

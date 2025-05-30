import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Settings } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { SearchInterface } from "@/components/SearchInterface";
import { InsufficientCreditsDialog } from "@/components/InsufficientCreditsDialog";
import { DuplicateSongDialog } from "@/components/DuplicateSongDialog";
import { AdminConsole } from "@/components/AdminConsole";
import { useSerialCommunication } from "@/components/SerialCommunication";
import { useBackgroundManager, BackgroundDisplay } from "@/components/BackgroundManager";

interface SearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  officialScore?: number;
  duration?: string;
}

interface PlaylistItem {
  id: string;
  title: string;
  channelTitle: string;
  videoId: string;
}

interface QueuedRequest {
  id: string;
  title: string;
  channelTitle: string;
  videoId: string;
  timestamp: string;
}

interface LogEntry {
  timestamp: string;
  type: 'SONG_PLAYED' | 'USER_SELECTION' | 'CREDIT_ADDED' | 'CREDIT_REMOVED';
  description: string;
  videoId?: string;
  creditAmount?: number;
}

interface UserRequest {
  timestamp: string;
  title: string;
  videoId: string;
  channelTitle: string;
}

interface CreditHistory {
  timestamp: string;
  amount: number;
  type: 'ADDED' | 'REMOVED';
  description: string;
}

interface BackgroundFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
}

interface JukeboxState {
  mode: 'FREEPLAY' | 'PAID';
  credits: number;
  priorityQueue: QueuedRequest[];
  defaultPlaylist: string;
  defaultPlaylistVideos: PlaylistItem[];
  inMemoryPlaylist: PlaylistItem[];
  currentVideoIndex: number;
  isSearchOpen: boolean;
  isAdminOpen: boolean;
  searchResults: SearchResult[];
  searchQuery: string;
  isSearching: boolean;
  selectedCoinAcceptor: string;
  playerWindow: Window | null;
  apiKey: string;
  logs: LogEntry[];
  userRequests: UserRequest[];
  creditHistory: CreditHistory[];
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  cycleBackgrounds: boolean;
  bounceVideos: boolean;
  backgroundCycleIndex: number;
  showKeyboard: boolean;
  showSearchResults: boolean;
  isPlayerRunning: boolean;
  currentlyPlaying: string;
  currentVideoId: string;
  maxSongLength: number;
  showInsufficientCredits: boolean;
  showDuplicateSong: boolean;
  duplicateSongTitle: string;
  isPlayerPaused: boolean;
  showSkipConfirmation: boolean;
  showMiniPlayer: boolean;
}

const DEFAULT_API_KEY = 'AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4';
const DEFAULT_PLAYLIST_ID = 'PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH';

// Helper function to clean title text by removing content in brackets
const cleanTitle = (title: string): string => {
  return title.replace(/\([^)]*\)/g, '').trim();
};

const Index = () => {
  const { toast } = useToast();

  const [state, setState] = useState<JukeboxState>({
    mode: 'FREEPLAY',
    credits: 0,
    priorityQueue: [],
    defaultPlaylist: DEFAULT_PLAYLIST_ID,
    defaultPlaylistVideos: [],
    inMemoryPlaylist: [],
    currentVideoIndex: 0,
    isSearchOpen: false,
    isAdminOpen: false,
    searchResults: [],
    searchQuery: '',
    isSearching: false,
    selectedCoinAcceptor: '',
    playerWindow: null,
    apiKey: DEFAULT_API_KEY,
    logs: [],
    userRequests: [],
    creditHistory: [],
    backgrounds: [{ id: 'default', name: 'Default', url: '/lovable-uploads/8948bfb8-e172-4535-bd9b-76f9d1c35307.png', type: 'image' }],
    selectedBackground: 'default',
    cycleBackgrounds: false,
    bounceVideos: false,
    backgroundCycleIndex: 0,
    showKeyboard: false,
    showSearchResults: false,
    isPlayerRunning: false,
    currentlyPlaying: 'Loading...',
    currentVideoId: '',
    maxSongLength: 10,
    showInsufficientCredits: false,
    showDuplicateSong: false,
    duplicateSongTitle: '',
    isPlayerPaused: false,
    showSkipConfirmation: false,
    showMiniPlayer: false
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    video: SearchResult | null;
  }>({ isOpen: false, video: null });

  // Helper function to shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Helper function to convert duration string to minutes
  const durationToMinutes = (duration: string): number => {
    // Parse ISO 8601 duration format (PT4M33S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 60 + minutes + (seconds > 30 ? 1 : 0); // Round up if over 30 seconds
  };

  // Helper function to format duration for display
  const formatDuration = (duration: string): string => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // Use background manager hook
  const { getCurrentBackground } = useBackgroundManager({
    backgrounds: state.backgrounds,
    selectedBackground: state.selectedBackground,
    cycleBackgrounds: state.cycleBackgrounds,
    backgroundCycleIndex: state.backgroundCycleIndex,
    bounceVideos: state.bounceVideos,
    onBackgroundCycleIndexChange: (index) => setState(prev => ({ ...prev, backgroundCycleIndex: index })),
    onSelectedBackgroundChange: (id) => setState(prev => ({ ...prev, selectedBackground: id }))
  });

  // Use serial communication hook
  useSerialCommunication({
    mode: state.mode,
    selectedCoinAcceptor: state.selectedCoinAcceptor,
    onCreditsChange: (credits) => setState(prev => ({ ...prev, credits })),
    credits: state.credits,
    onAddLog: addLog
  });

  // Initialize player window and load default playlist
  useEffect(() => {
    const openPlayerWindow = () => {
      const playerWindow = window.open('/player.html', 'JukeboxPlayer', 
        'width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no');
      
      if (playerWindow) {
        setState(prev => ({ ...prev, playerWindow, isPlayerRunning: true }));
        console.log('Player window opened successfully');
        loadPlaylistVideos(DEFAULT_PLAYLIST_ID);
      } else {
        toast({
          title: "Error",
          description: "Failed to open player window. Please allow popups.",
          variant: "destructive"
        });
      }
    };

    openPlayerWindow();

    return () => {
      if (state.playerWindow && !state.playerWindow.closed) {
        state.playerWindow.close();
      }
    };
  }, []);

  // Enhanced autoplay logic
  useEffect(() => {
    if (state.inMemoryPlaylist.length > 0 && state.priorityQueue.length === 0 && state.isPlayerRunning && !state.isPlayerPaused) {
      // Only auto-start if nothing is currently playing
      if (state.currentlyPlaying === 'Loading...' || state.currentlyPlaying === '') {
        playNextSong();
      }
    }
  }, [state.inMemoryPlaylist, state.priorityQueue, state.isPlayerRunning, state.isPlayerPaused]);

  // Enhanced video end handling with proper queue management
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'jukeboxStatus' && event.newValue) {
        const status = JSON.parse(event.newValue);
        
        // Update currently playing based on player window communication
        if (status.status === 'playing' && status.title) {
          setState(prev => ({ 
            ...prev, 
            currentlyPlaying: cleanTitle(status.title),
            currentVideoId: status.videoId || prev.currentVideoId
          }));
        }
        
        if (status.status === 'ended' || status.status === 'fadeComplete') {
          handleVideoEnded();
        }
        
        // Handle video unavailable/error - auto-skip
        if (status.status === 'error' || status.status === 'unavailable') {
          console.log('Video unavailable or error, auto-skipping...');
          addLog('SONG_PLAYED', `Auto-skipping unavailable video: ${state.currentlyPlaying}`);
          handleVideoEnded();
        }
      }
      
      // Listen for player window commands to track what's playing
      if (event.key === 'jukeboxCommand' && event.newValue) {
        const command = JSON.parse(event.newValue);
        if (command.action === 'play' && command.title) {
          setState(prev => ({ 
            ...prev, 
            currentlyPlaying: cleanTitle(command.title),
            currentVideoId: command.videoId || prev.currentVideoId
          }));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  function addLog(type: LogEntry['type'], description: string, videoId?: string, creditAmount?: number) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      description,
      videoId,
      creditAmount
    };
    setState(prev => ({ ...prev, logs: [logEntry, ...prev.logs] }));
  }

  function addUserRequest(title: string, videoId: string, channelTitle: string) {
    const userRequest: UserRequest = {
      timestamp: new Date().toISOString(),
      title: cleanTitle(title),
      videoId,
      channelTitle
    };
    setState(prev => ({ ...prev, userRequests: [userRequest, ...prev.userRequests] }));
  }

  function addCreditHistory(amount: number, type: 'ADDED' | 'REMOVED', description: string) {
    const creditEntry: CreditHistory = {
      timestamp: new Date().toISOString(),
      amount,
      type,
      description
    };
    setState(prev => ({ ...prev, creditHistory: [creditEntry, ...prev.creditHistory] }));
  }

  const loadPlaylistVideos = async (playlistId: string) => {
    try {
      let allVideos: PlaylistItem[] = [];
      let nextPageToken = '';
      
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
            title: cleanTitle(item.snippet.title),
            channelTitle: item.snippet.channelTitle,
            videoId: item.snippet.resourceId.videoId
          }));
        
        allVideos = [...allVideos, ...videos];
        nextPageToken = data.nextPageToken || '';
      } while (nextPageToken);

      // Create shuffled in-memory playlist
      const shuffled = shuffleArray(allVideos);
      setState(prev => ({ 
        ...prev, 
        defaultPlaylistVideos: allVideos, 
        inMemoryPlaylist: shuffled,
        currentVideoIndex: 0
      }));
      
      console.log(`Loaded ${allVideos.length} videos from playlist and shuffled`);
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast({
        title: "Playlist Error",
        description: "Failed to load default playlist",
        variant: "destructive"
      });
    }
  };

  const playNextSong = () => {
    // Always check priority queue first
    if (state.priorityQueue.length > 0) {
      const nextRequest = state.priorityQueue[0];
      setState(prev => ({ 
        ...prev, 
        priorityQueue: prev.priorityQueue.slice(1) 
      }));
      
      playSong(nextRequest.videoId, nextRequest.title, nextRequest.channelTitle, 'USER_SELECTION');
      return;
    }
    
    // Play from in-memory playlist
    if (state.inMemoryPlaylist.length > 0) {
      const nextVideo = state.inMemoryPlaylist[0];
      
      // Move played song to end of playlist
      setState(prev => ({ 
        ...prev, 
        inMemoryPlaylist: [...prev.inMemoryPlaylist.slice(1), nextVideo]
      }));
      
      playSong(nextVideo.videoId, nextVideo.title, nextVideo.channelTitle, 'SONG_PLAYED');
    }
  };

  const playSong = (videoId: string, title: string, artist: string, logType: 'SONG_PLAYED' | 'USER_SELECTION') => {
    if (state.playerWindow && !state.playerWindow.closed) {
      const command = {
        action: 'play',
        videoId: videoId,
        title: title,
        artist: artist
      };
      
      try {
        state.playerWindow.localStorage.setItem('jukeboxCommand', JSON.stringify(command));
        setState(prev => ({ 
          ...prev, 
          currentlyPlaying: cleanTitle(title),
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

  const handleVideoEnded = () => {
    console.log('Video ended, checking priority queue and playing next song...');
    playNextSong();
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    console.log('performSearch called with query:', query);
    
    if (query.toUpperCase() === 'ADMIN') {
      setState(prev => ({ 
        ...prev, 
        isAdminOpen: true, 
        searchQuery: '', 
        showKeyboard: false,
        showSearchResults: false,
        isSearchOpen: false 
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isSearching: true, 
      searchResults: [], 
      showKeyboard: false, 
      showSearchResults: true 
    }));

    try {
      console.log('Starting YouTube search for:', query);
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=50&key=${state.apiKey}`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('YouTube API response:', data);
      
      if (data.items && data.items.length > 0) {
        // Get video durations
        const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${state.apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        // Create duration map
        const durationMap = new Map();
        detailsData.items?.forEach((item: any) => {
          durationMap.set(item.id, item.contentDetails.duration);
        });
        
        const filteredResults = filterForOfficial(data.items, query);
        const searchResults: SearchResult[] = filteredResults
          .map(video => {
            const duration = durationMap.get(video.id.videoId) || '';
            const durationMinutes = durationToMinutes(duration);
            return {
              id: video.id.videoId,
              title: cleanTitle(video.snippet.title),
              channelTitle: video.snippet.channelTitle,
              thumbnailUrl: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
              videoUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
              officialScore: video.officialScore,
              duration: formatDuration(duration),
              durationMinutes
            };
          })
          .filter(video => video.durationMinutes <= state.maxSongLength)
          .slice(0, 20);
        
        console.log('Filtered search results:', searchResults);
        setState(prev => ({ ...prev, searchResults }));
      } else {
        console.log('No search results found');
        toast({
          title: "No Results",
          description: "No music videos found for your search.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for music videos.",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isSearching: false }));
    }
  };

  const filterForOfficial = (videos: any[], originalQuery: string) => {
    const officialKeywords = [
      "official video", "official music video", "official audio", 
      "official lyric video", "vevo", "official channel"
    ];
    
    return videos
      .map(video => {
        let score = 0;
        const titleLower = video.snippet.title.toLowerCase();
        const channelTitleLower = video.snippet.channelTitle.toLowerCase();

        if (channelTitleLower.includes("vevo")) score += 10;
        
        for (const keyword of officialKeywords) {
          if (titleLower.includes(keyword)) {
            score += 5;
            break;
          }
        }
        
        if (channelTitleLower.includes("official")) score += 3;
        if (titleLower.includes("cover") || titleLower.includes("remix")) score -= 5;
        
        video.officialScore = score;
        return video;
      })
      .filter(video => video.officialScore > 0)
      .sort((a, b) => b.officialScore - a.officialScore);
  };

  const handleVideoSelect = (video: SearchResult) => {
    console.log('Video selected:', video);
    
    // Check for duplicate in priority queue
    const isDuplicate = state.priorityQueue.some(req => req.videoId === video.id);
    
    if (isDuplicate) {
      setState(prev => ({ 
        ...prev, 
        showDuplicateSong: true, 
        duplicateSongTitle: video.title 
      }));
      return;
    }
    
    setConfirmDialog({ isOpen: true, video });
  };

  const confirmAddToPlaylist = () => {
    if (!confirmDialog.video) return;

    console.log('Adding video to priority queue:', confirmDialog.video);

    if (state.mode === 'PAID' && state.credits === 0) {
      setState(prev => ({ ...prev, showInsufficientCredits: true }));
      setConfirmDialog({ isOpen: false, video: null });
      return;
    }

    // Add to priority queue
    const newRequest: QueuedRequest = {
      id: confirmDialog.video.id,
      title: confirmDialog.video.title,
      channelTitle: confirmDialog.video.channelTitle,
      videoId: confirmDialog.video.id,
      timestamp: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      priorityQueue: [...prev.priorityQueue, newRequest],
      credits: prev.mode === 'PAID' ? Math.max(0, prev.credits - 1) : prev.credits
    }));

    addLog('USER_SELECTION', `Selected: ${confirmDialog.video.title}`, confirmDialog.video.id);
    addUserRequest(confirmDialog.video.title, confirmDialog.video.id, confirmDialog.video.channelTitle);
    if (state.mode === 'PAID') {
      addLog('CREDIT_REMOVED', 'Song request cost', undefined, -1);
      addCreditHistory(1, 'REMOVED', 'Song request cost');
    }

    toast({
      title: "Song Added",
      description: `"${confirmDialog.video.title}" added to priority queue`,
    });

    setConfirmDialog({ isOpen: false, video: null });
    setState(prev => ({ 
      ...prev, 
      isSearchOpen: false, 
      showKeyboard: false, 
      showSearchResults: false,
      searchQuery: '',
      searchResults: []
    }));
  };

  const handleKeyboardInput = (key: string) => {
    console.log('Keyboard input:', key);
    
    setState(prev => {
      let newQuery = prev.searchQuery;
      
      switch (key) {
        case 'BACKSPACE':
          newQuery = newQuery.slice(0, -1);
          console.log('New query after backspace:', newQuery);
          return { ...prev, searchQuery: newQuery };
        case 'SPACE':
          newQuery += ' ';
          console.log('New query after space:', newQuery);
          return { ...prev, searchQuery: newQuery };
        case 'SEARCH':
          console.log('Search button pressed, query:', newQuery);
          if (newQuery.trim()) {
            // Perform search asynchronously
            setTimeout(() => performSearch(newQuery), 0);
          }
          return prev; // Don't update query here, let performSearch handle state
        default:
          newQuery += key;
          console.log('New query after key press:', newQuery);
          return { ...prev, searchQuery: newQuery };
      }
    });
  };

  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    
    const newBackground: BackgroundFile = {
      id: Date.now().toString(),
      name: file.name,
      url,
      type
    };

    setState(prev => ({
      ...prev,
      backgrounds: [...prev.backgrounds, newBackground]
    }));

    toast({
      title: "Background Added",
      description: `${file.name} has been added to backgrounds`,
    });
  };

  const getUpcomingTitles = () => {
    const upcoming = [];
    
    // Add priority queue songs first
    for (let i = 0; i < Math.min(3, state.priorityQueue.length); i++) {
      upcoming.push(`🎵 ${state.priorityQueue[i].title}`);
    }
    
    // Fill remaining slots with in-memory playlist songs
    if (upcoming.length < 3 && state.inMemoryPlaylist.length > 0) {
      const remainingSlots = 3 - upcoming.length;
      for (let i = 0; i < Math.min(remainingSlots, state.inMemoryPlaylist.length); i++) {
        upcoming.push(state.inMemoryPlaylist[i].title);
      }
    }
    
    return upcoming;
  };

  const isCurrentSongUserRequest = () => {
    // The currently playing song is a user request if it matches the last played user request or if priorityQueue is not empty
    // Since priorityQueue is emptied on play, we check if currentlyPlaying matches any user request in userRequests
    return state.userRequests.some(req => req.title === state.currentlyPlaying);
  };

  const handlePlayerToggle = () => {
    if (!state.playerWindow || state.playerWindow.closed) {
      console.log('Player window is closed, reopening...');
      const playerWindow = window.open('/player.html', 'JukeboxPlayer', 
        'width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no');
      
      if (playerWindow) {
        setState(prev => ({ ...prev, playerWindow, isPlayerRunning: true, isPlayerPaused: false }));
        console.log('Player window reopened successfully');
        
        // Start playing the first song in the playlist after a short delay
        setTimeout(() => {
          if (state.inMemoryPlaylist.length > 0) {
            playNextSong();
          }
        }, 2000); // Give the player window time to load
        
        addLog('SONG_PLAYED', 'Player window reopened and started');
        return;
      } else {
        toast({
          title: "Error",
          description: "Failed to reopen player window. Please allow popups.",
          variant: "destructive"
        });
        return;
      }
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
      playNextSong();
      addLog('SONG_PLAYED', 'Player started by admin');
    }
  };

  const handleSkipSong = () => {
    if (isCurrentSongUserRequest()) {
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

  const handleDefaultPlaylistChange = (playlistId: string) => {
    setState(prev => ({ ...prev, defaultPlaylist: playlistId }));
    loadPlaylistVideos(playlistId);
  };

  const handlePlaylistReorder = (newPlaylist: PlaylistItem[]) => {
    setState(prev => ({ ...prev, inMemoryPlaylist: newPlaylist }));
  };

  const handlePlaylistShuffle = () => {
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

  const getCurrentPlaylistForDisplay = () => {
    const playlist = [];
    
    // Add currently playing song at top
    if (state.currentlyPlaying && state.currentlyPlaying !== 'Loading...') {
      playlist.push({
        id: 'now-playing',
        title: state.currentlyPlaying,
        channelTitle: 'Now Playing',
        videoId: 'current',
        isNowPlaying: true
      });
    }
    
    // Add priority queue
    playlist.push(...state.priorityQueue.map(req => ({
      ...req,
      isUserRequest: true
    })));
    
    // Add next songs from in-memory playlist
    playlist.push(...state.inMemoryPlaylist.slice(0, 20).map(song => ({
      ...song,
      isUserRequest: false
    })));
    
    return playlist;
  };

  const currentBackground = getCurrentBackground();

  return (
    <BackgroundDisplay background={currentBackground} bounceVideos={state.bounceVideos}>
      <div className="relative z-10 min-h-screen p-8 flex flex-col">
        {/* Now Playing Ticker - Top Left - Made wider */}
        <div className="absolute top-4 left-4 z-20">
          <Card className="bg-amber-900/90 border-amber-600 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="text-amber-100 font-bold text-lg w-96 truncate">
                Now Playing: {state.currentlyPlaying}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Credits - Top Right */}
        <div className="flex justify-end mb-8">
          <Card className="bg-amber-900/90 border-amber-600 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="text-amber-100 font-bold text-xl">
                CREDIT: {state.mode === 'FREEPLAY' ? 'Free Play' : state.credits}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-amber-200 drop-shadow-2xl mb-4">
            MUSIC JUKEBOX
          </h1>
          <p className="text-2xl text-amber-100 drop-shadow-lg">
            Touch to Select Your Music
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center relative">
          {/* Mini Player - positioned above the search button */}
          {state.showMiniPlayer && state.currentVideoId && (
            <div className="absolute z-30 pointer-events-none">
              <div className="relative w-48 h-27 rounded-lg overflow-hidden shadow-2xl">
                {/* Vignette overlay for feathered edges */}
                <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_30px_10px_rgba(0,0,0,0.6)] z-10 pointer-events-none"></div>
                <iframe
                  src={`https://www.youtube.com/embed/${state.currentVideoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1`}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen={false}
                  style={{ pointerEvents: 'none' }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={() => {
              console.log('Search button clicked - opening search interface');
              setState(prev => ({ ...prev, isSearchOpen: true, showKeyboard: true, showSearchResults: false }));
            }}
            className="w-96 h-24 text-3xl font-bold bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-amber-900 shadow-2xl transform hover:scale-105 transition-all duration-200 border-4 border-amber-500"
            style={{ filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))' }}
          >
            🎵 Search for Music 🎵
          </Button>
        </div>

        {/* Coming Up Ticker - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-amber-200 py-2 overflow-hidden">
          <div className="whitespace-nowrap animate-marquee">
            <span className="text-lg font-bold">COMING UP: </span>
            {getUpcomingTitles().map((title, index) => (
              <span key={index} className="mx-8 text-lg">
                {index + 1}. {title}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-4 left-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState(prev => ({ ...prev, isAdminOpen: true }))}
            className="text-amber-200 hover:text-amber-100 opacity-30 hover:opacity-100"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Skip Confirmation Dialog */}
      <Dialog open={state.showSkipConfirmation} onOpenChange={(open) => !open && setState(prev => ({ ...prev, showSkipConfirmation: false }))}>
        <DialogContent className="bg-gradient-to-b from-amber-50 to-amber-100 border-amber-600">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-900">Skip User Selection?</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-amber-800">
              Current song is a user selection. Are you sure you want to skip to the next song?
            </p>
          </div>
          
          <DialogFooter className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setState(prev => ({ ...prev, showSkipConfirmation: false }))}
              className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              No
            </Button>
            <Button
              onClick={performSkip}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Yes, Skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SearchInterface
        isOpen={state.isSearchOpen}
        onClose={() => {
          console.log('Search interface closing');
          setState(prev => ({ 
            ...prev, 
            isSearchOpen: false, 
            showKeyboard: false, 
            showSearchResults: false,
            searchQuery: '', 
            searchResults: [] 
          }));
        }}
        searchQuery={state.searchQuery}
        onSearchQueryChange={(query) => {
          console.log('Search query changed:', query);
          setState(prev => ({ ...prev, searchQuery: query }));
        }}
        searchResults={state.searchResults}
        isSearching={state.isSearching}
        showKeyboard={state.showKeyboard}
        showSearchResults={state.showSearchResults}
        onKeyboardInput={handleKeyboardInput}
        onVideoSelect={handleVideoSelect}
        onBackToSearch={() => {
          console.log('Back to search pressed');
          setState(prev => ({ ...prev, showSearchResults: false, showKeyboard: true }));
        }}
        mode={state.mode}
        credits={state.credits}
        onInsufficientCredits={() => setState(prev => ({ ...prev, showInsufficientCredits: true }))}
      />

      {/* Insufficient Credits Dialog */}
      <InsufficientCreditsDialog
        isOpen={state.showInsufficientCredits}
        onClose={() => setState(prev => ({ 
          ...prev, 
          showInsufficientCredits: false,
          isSearchOpen: false, 
          showKeyboard: false, 
          showSearchResults: false,
          searchQuery: '', 
          searchResults: [] 
        }))}
      />

      {/* Duplicate Song Dialog */}
      <DuplicateSongDialog
        isOpen={state.showDuplicateSong}
        onClose={() => setState(prev => ({ ...prev, showDuplicateSong: false, duplicateSongTitle: '' }))}
        songTitle={state.duplicateSongTitle}
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog({ isOpen: false, video: null })}>
        <DialogContent className="bg-gradient-to-b from-amber-50 to-amber-100 border-amber-600">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-900">Add song to Playlist?</DialogTitle>
          </DialogHeader>
          
          {confirmDialog.video && (
            <div className="py-4">
              <div className="flex gap-3">
                <img 
                  src={confirmDialog.video.thumbnailUrl} 
                  alt={confirmDialog.video.title}
                  className="w-20 h-15 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold text-amber-900">{confirmDialog.video.title}</h3>
                  <p className="text-amber-700">{confirmDialog.video.channelTitle}</p>
                  {confirmDialog.video.duration && (
                    <p className="text-amber-600 text-sm">{confirmDialog.video.duration}</p>
                  )}
                  {state.mode === 'PAID' && (
                    <p className="text-sm text-amber-600 mt-1">Cost: 1 Credit</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ isOpen: false, video: null })}
              className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              No
            </Button>
            <Button
              onClick={confirmAddToPlaylist}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConsole
        isOpen={state.isAdminOpen}
        onClose={() => setState(prev => ({ ...prev, isAdminOpen: false }))}
        mode={state.mode}
        onModeChange={(mode) => setState(prev => ({ ...prev, mode }))}
        credits={state.credits}
        onCreditsChange={(credits) => setState(prev => ({ ...prev, credits }))}
        apiKey={state.apiKey}
        onApiKeyChange={(apiKey) => setState(prev => ({ ...prev, apiKey }))}
        selectedCoinAcceptor={state.selectedCoinAcceptor}
        onCoinAcceptorChange={(device) => setState(prev => ({ ...prev, selectedCoinAcceptor: device }))}
        logs={state.logs}
        userRequests={state.userRequests}
        creditHistory={state.creditHistory}
        backgrounds={state.backgrounds}
        selectedBackground={state.selectedBackground}
        onBackgroundChange={(id) => setState(prev => ({ ...prev, selectedBackground: id }))}
        cycleBackgrounds={state.cycleBackgrounds}
        onCycleBackgroundsChange={(cycle) => setState(prev => ({ ...prev, cycleBackgrounds: cycle }))}
        bounceVideos={state.bounceVideos}
        onBounceVideosChange={(bounce) => setState(prev => ({ ...prev, bounceVideos: bounce }))}
        onBackgroundUpload={handleBackgroundUpload}
        onAddLog={addLog}
        onAddUserRequest={addUserRequest}
        onAddCreditHistory={addCreditHistory}
        playerWindow={state.playerWindow}
        isPlayerRunning={state.isPlayerRunning}
        onPlayerToggle={handlePlayerToggle}
        onSkipSong={handleSkipSong}
        maxSongLength={state.maxSongLength}
        onMaxSongLengthChange={(minutes) => setState(prev => ({ ...prev, maxSongLength: minutes }))}
        defaultPlaylist={state.defaultPlaylist}
        onDefaultPlaylistChange={handleDefaultPlaylistChange}
        currentPlaylistVideos={getCurrentPlaylistForDisplay()}
        onPlaylistReorder={handlePlaylistReorder}
        onPlaylistShuffle={handlePlaylistShuffle}
        currentlyPlaying={state.currentlyPlaying}
        priorityQueue={state.priorityQueue}
        showMiniPlayer={state.showMiniPlayer}
        onShowMiniPlayerChange={(show) => setState(prev => ({ ...prev, showMiniPlayer: show }))}
      />
    </BackgroundDisplay>
  );
};

export default Index;

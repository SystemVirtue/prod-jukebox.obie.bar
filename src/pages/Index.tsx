import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Settings } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { SearchInterface } from "@/components/SearchInterface";
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
}

interface PlaylistItem {
  id: string;
  title: string;
  channelTitle: string;
  videoId: string;
}

interface LogEntry {
  timestamp: string;
  type: 'SONG_PLAYED' | 'USER_SELECTION' | 'CREDIT_ADDED' | 'CREDIT_REMOVED';
  description: string;
  videoId?: string;
  creditAmount?: number;
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
  currentPlaylist: string[];
  defaultPlaylist: string;
  defaultPlaylistVideos: PlaylistItem[];
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
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  cycleBackgrounds: boolean;
  backgroundCycleIndex: number;
  showKeyboard: boolean;
  showSearchResults: boolean;
  isPlayerRunning: boolean;
}

const DEFAULT_API_KEY = 'AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4';
const DEFAULT_PLAYLIST_ID = 'PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH';

const Index = () => {
  const { toast } = useToast();

  const [state, setState] = useState<JukeboxState>({
    mode: 'FREEPLAY',
    credits: 0,
    currentPlaylist: [],
    defaultPlaylist: DEFAULT_PLAYLIST_ID,
    defaultPlaylistVideos: [],
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
    backgrounds: [{ id: 'default', name: 'Default', url: '/lovable-uploads/8948bfb8-e172-4535-bd9b-76f9d1c35307.png', type: 'image' }],
    selectedBackground: 'default',
    cycleBackgrounds: false,
    backgroundCycleIndex: 0,
    showKeyboard: false,
    showSearchResults: false,
    isPlayerRunning: false
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    video: SearchResult | null;
  }>({ isOpen: false, video: null });

  // Use background manager hook
  const { getCurrentBackground } = useBackgroundManager({
    backgrounds: state.backgrounds,
    selectedBackground: state.selectedBackground,
    cycleBackgrounds: state.cycleBackgrounds,
    backgroundCycleIndex: state.backgroundCycleIndex,
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

    return () => {
      if (state.playerWindow && !state.playerWindow.closed) {
        state.playerWindow.close();
      }
    };
  }, []);

  // Autoplay from default playlist
  useEffect(() => {
    if (state.defaultPlaylistVideos.length > 0 && state.currentPlaylist.length === 0) {
      playNextDefaultVideo();
    }
  }, [state.defaultPlaylistVideos, state.currentPlaylist]);

  // Listen for player status updates
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'jukeboxStatus' && event.newValue) {
        const status = JSON.parse(event.newValue);
        if (status.status === 'ended') {
          handleVideoEnded();
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

  const loadPlaylistVideos = async (playlistId: string) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${state.apiKey}`
      );
      
      if (!response.ok) throw new Error('Failed to load playlist');
      
      const data = await response.json();
      const videos: PlaylistItem[] = data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        videoId: item.snippet.resourceId.videoId
      }));

      setState(prev => ({ ...prev, defaultPlaylistVideos: videos }));
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast({
        title: "Playlist Error",
        description: "Failed to load default playlist",
        variant: "destructive"
      });
    }
  };

  const playNextDefaultVideo = () => {
    if (state.defaultPlaylistVideos.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * state.defaultPlaylistVideos.length);
    const video = state.defaultPlaylistVideos[randomIndex];
    
    if (state.playerWindow && !state.playerWindow.closed) {
      const command = {
        action: 'play',
        videoId: video.videoId,
        title: video.title,
        artist: video.channelTitle
      };
      
      try {
        state.playerWindow.localStorage.setItem('jukeboxCommand', JSON.stringify(command));
        addLog('SONG_PLAYED', `Autoplay: ${video.title}`, video.videoId);
      } catch (error) {
        console.error('Error sending command to player:', error);
      }
    }
  };

  const handleVideoEnded = () => {
    if (state.currentPlaylist.length > 0) {
      const nextVideoId = state.currentPlaylist[0];
      setState(prev => ({ 
        ...prev, 
        currentPlaylist: prev.currentPlaylist.slice(1) 
      }));
      
      if (state.playerWindow && !state.playerWindow.closed) {
        const command = {
          action: 'play',
          videoId: nextVideoId,
          title: 'User Selection',
          artist: 'Unknown'
        };
        
        try {
          state.playerWindow.localStorage.setItem('jukeboxCommand', JSON.stringify(command));
        } catch (error) {
          console.error('Error sending command to player:', error);
        }
      }
    } else {
      playNextDefaultVideo();
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
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

    setState(prev => ({ ...prev, isSearching: true, searchResults: [], showKeyboard: false, showSearchResults: true }));

    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=50&key=${state.apiKey}`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const filteredResults = filterForOfficial(data.items, query);
        const searchResults: SearchResult[] = filteredResults.slice(0, 20).map(video => ({
          id: video.id.videoId,
          title: video.snippet.title,
          channelTitle: video.snippet.channelTitle,
          thumbnailUrl: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
          videoUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
          officialScore: video.officialScore
        }));
        
        setState(prev => ({ ...prev, searchResults }));
      } else {
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
    setConfirmDialog({ isOpen: true, video });
  };

  const confirmAddToPlaylist = () => {
    if (!confirmDialog.video) return;

    if (state.mode === 'PAID' && state.credits === 0) {
      toast({
        title: "Insufficient Credits",
        description: "Please add credit to make requests.",
        variant: "destructive"
      });
      setConfirmDialog({ isOpen: false, video: null });
      return;
    }

    setState(prev => ({
      ...prev,
      currentPlaylist: [...prev.currentPlaylist, confirmDialog.video!.id],
      credits: prev.mode === 'PAID' ? Math.max(0, prev.credits - 1) : prev.credits
    }));

    if (state.playerWindow && !state.playerWindow.closed) {
      const command = {
        action: 'play',
        videoId: confirmDialog.video.id,
        title: confirmDialog.video.title,
        artist: confirmDialog.video.channelTitle
      };
      
      try {
        state.playerWindow.localStorage.setItem('jukeboxCommand', JSON.stringify(command));
      } catch (error) {
        console.error('Error sending command to player:', error);
      }
    }

    addLog('USER_SELECTION', `Selected: ${confirmDialog.video.title}`, confirmDialog.video.id);
    if (state.mode === 'PAID') {
      addLog('CREDIT_REMOVED', 'Song request cost', undefined, -1);
    }

    toast({
      title: "Song Added",
      description: `"${confirmDialog.video.title}" added to playlist`,
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
    setState(prev => {
      let newQuery = prev.searchQuery;
      
      switch (key) {
        case 'BACKSPACE':
          newQuery = newQuery.slice(0, -1);
          break;
        case 'SPACE':
          newQuery += ' ';
          break;
        case 'SEARCH':
          if (newQuery.trim()) {
            performSearch(newQuery);
          }
          return prev;
        default:
          newQuery += key;
          break;
      }
      
      return { ...prev, searchQuery: newQuery };
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
    if (state.currentPlaylist.length > 0) {
      return state.currentPlaylist.slice(0, 3).map(videoId => {
        const result = state.searchResults.find(r => r.id === videoId);
        return result ? result.title : 'Unknown Song';
      });
    } else {
      return state.defaultPlaylistVideos.slice(0, 3).map(video => video.title);
    }
  };

  const handlePlayerToggle = () => {
    if (state.isPlayerRunning) {
      // Stop player
      if (state.playerWindow && !state.playerWindow.closed) {
        const command = { action: 'stop' };
        try {
          state.playerWindow.localStorage.setItem('jukeboxCommand', JSON.stringify(command));
          addLog('SONG_PLAYED', 'Player stopped by admin');
        } catch (error) {
          console.error('Error sending stop command:', error);
        }
      }
      setState(prev => ({ ...prev, isPlayerRunning: false }));
    } else {
      // Start player
      setState(prev => ({ ...prev, isPlayerRunning: true }));
      playNextDefaultVideo();
      addLog('SONG_PLAYED', 'Player started by admin');
    }
  };

  const handleSkipSong = () => {
    if (state.playerWindow && !state.playerWindow.closed) {
      const command = { action: 'fadeOutAndBlack', fadeDuration: 3000 };
      try {
        state.playerWindow.localStorage.setItem('jukeboxCommand', JSON.stringify(command));
        addLog('SONG_PLAYED', 'Song skipped by admin (3s fade)');
      } catch (error) {
        console.error('Error sending skip command:', error);
      }
    }
  };

  const currentBackground = getCurrentBackground();

  return (
    <BackgroundDisplay background={currentBackground}>
      <div className="relative z-10 min-h-screen p-8 flex flex-col">
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

        <div className="flex-1 flex items-center justify-center">
          <Button
            onClick={() => setState(prev => ({ ...prev, isSearchOpen: true, showKeyboard: true }))}
            className="w-96 h-24 text-3xl font-bold bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-amber-900 shadow-2xl transform hover:scale-105 transition-all duration-200 border-4 border-amber-500"
          >
            🎵 Search for Music 🎵
          </Button>
        </div>

        {/* Ticker */}
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

      <SearchInterface
        isOpen={state.isSearchOpen}
        onClose={() => setState(prev => ({ 
          ...prev, 
          isSearchOpen: false, 
          showKeyboard: false, 
          showSearchResults: false,
          searchQuery: '', 
          searchResults: [] 
        }))}
        searchQuery={state.searchQuery}
        onSearchQueryChange={(query) => setState(prev => ({ ...prev, searchQuery: query }))}
        searchResults={state.searchResults}
        isSearching={state.isSearching}
        showKeyboard={state.showKeyboard}
        showSearchResults={state.showSearchResults}
        onKeyboardInput={handleKeyboardInput}
        onVideoSelect={handleVideoSelect}
        onBackToSearch={() => setState(prev => ({ ...prev, showSearchResults: false, showKeyboard: true }))}
      />

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
        backgrounds={state.backgrounds}
        selectedBackground={state.selectedBackground}
        onBackgroundChange={(id) => setState(prev => ({ ...prev, selectedBackground: id }))}
        cycleBackgrounds={state.cycleBackgrounds}
        onCycleBackgroundsChange={(cycle) => setState(prev => ({ ...prev, cycleBackgrounds: cycle }))}
        onBackgroundUpload={handleBackgroundUpload}
        onAddLog={addLog}
        playerWindow={state.playerWindow}
        isPlayerRunning={state.isPlayerRunning}
        onPlayerToggle={handlePlayerToggle}
        onSkipSong={handleSkipSong}
      />
    </BackgroundDisplay>
  );
};

export default Index;

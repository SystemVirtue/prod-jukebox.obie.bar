import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Settings, Upload, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  serialPort: any;
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  cycleBackgrounds: boolean;
  backgroundCycleIndex: number;
  showKeyboard: boolean;
  showSearchResults: boolean;
}

const DEFAULT_API_KEY = 'AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4';
const DEFAULT_PLAYLIST_ID = 'PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH';

const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ['SPACE', 'BACKSPACE', 'SEARCH']
];

const Index = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const cycleIntervalRef = useRef<NodeJS.Timeout>();

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
    serialPort: null,
    backgrounds: [{ id: 'default', name: 'Default', url: '/lovable-uploads/8948bfb8-e172-4535-bd9b-76f9d1c35307.png', type: 'image' }],
    selectedBackground: 'default',
    cycleBackgrounds: false,
    backgroundCycleIndex: 0,
    showKeyboard: false,
    showSearchResults: false
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    video: SearchResult | null;
  }>({ isOpen: false, video: null });

  // Initialize player window and load default playlist
  useEffect(() => {
    const playerWindow = window.open('/player.html', 'JukeboxPlayer', 
      'width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no');
    
    if (playerWindow) {
      setState(prev => ({ ...prev, playerWindow }));
      console.log('Player window opened successfully');
      
      // Load default playlist
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

  // Setup serial port communication
  useEffect(() => {
    if (state.mode === 'PAID' && state.selectedCoinAcceptor && 'serial' in navigator) {
      setupSerialConnection();
    }
  }, [state.mode, state.selectedCoinAcceptor]);

  // Background cycling logic
  useEffect(() => {
    if (state.cycleBackgrounds && state.backgrounds.length > 1) {
      const validBackgrounds = state.backgrounds.filter(bg => bg.id !== 'default');
      if (validBackgrounds.length > 0) {
        cycleIntervalRef.current = setInterval(() => {
          setState(prev => {
            const nextIndex = (prev.backgroundCycleIndex + 1) % validBackgrounds.length;
            const nextBackground = validBackgrounds[nextIndex];
            return {
              ...prev,
              backgroundCycleIndex: nextIndex,
              selectedBackground: nextBackground.id
            };
          });
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
  }, [state.cycleBackgrounds, state.backgrounds]);

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

  const addLog = (type: LogEntry['type'], description: string, videoId?: string, creditAmount?: number) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      description,
      videoId,
      creditAmount
    };
    setState(prev => ({ ...prev, logs: [logEntry, ...prev.logs] }));
  };

  const setupSerialConnection = async () => {
    try {
      if ('serial' in navigator) {
        const ports = await (navigator as any).serial.getPorts();
        let targetPort = ports.find((port: any) => 
          port.getInfo().usbProductId === 1420 || 
          port.getInfo().serialNumber?.includes('usbserial-1420')
        );

        if (!targetPort) {
          targetPort = await (navigator as any).serial.requestPort();
        }

        await targetPort.open({ baudRate: 9600 });
        setState(prev => ({ ...prev, serialPort: targetPort }));

        const reader = targetPort.readable.getReader();
        const decoder = new TextDecoder();

        const readLoop = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              
              const text = decoder.decode(value);
              if (text.includes('a')) {
                setState(prev => ({ ...prev, credits: prev.credits + 1 }));
                addLog('CREDIT_ADDED', 'COIN DEPOSITED - $1 ("a")', undefined, 1);
                toast({ title: "Credit Added", description: "+1 Credit from coin acceptor" });
              } else if (text.includes('b')) {
                setState(prev => ({ ...prev, credits: prev.credits + 3 }));
                addLog('CREDIT_ADDED', 'COIN DEPOSITED - $3 ("b")', undefined, 3);
                toast({ title: "Credits Added", description: "+3 Credits from coin acceptor" });
              }
            }
          } catch (error) {
            console.error('Serial read error:', error);
          }
        };

        readLoop();
      }
    } catch (error) {
      console.error('Serial connection error:', error);
      toast({
        title: "Serial Connection Error",
        description: "Failed to connect to coin acceptor",
        variant: "destructive"
      });
    }
  };

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

  const loadChannelPlaylists = async () => {
    try {
      // First get channel ID from channel handle
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=@outsideobie2113&type=channel&maxResults=1&key=${state.apiKey}`
      );
      
      if (!channelResponse.ok) throw new Error('Failed to find channel');
      
      const channelData = await channelResponse.json();
      if (channelData.items.length === 0) throw new Error('Channel not found');
      
      const channelId = channelData.items[0].snippet.channelId;
      
      // Now get playlists
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&maxResults=50&key=${state.apiKey}`
      );
      
      if (!playlistResponse.ok) throw new Error('Failed to load playlists');
      
      const playlistData = await playlistResponse.json();
      return playlistData.items;
    } catch (error) {
      console.error('Error loading channel playlists:', error);
      return [];
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
      // Play next user selection
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
      // Play next from default playlist
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

  const getCurrentBackground = () => {
    return state.backgrounds.find(bg => bg.id === state.selectedBackground) || state.backgrounds[0];
  };

  const currentBackground = getCurrentBackground();

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ 
        backgroundImage: currentBackground.type === 'image' ? `url('${currentBackground.url}')` : 'none',
        backgroundSize: 'cover'
      }}
    >
      {currentBackground.type === 'video' && (
        <video
          ref={backgroundVideoRef}
          autoPlay
          loop
          muted
          className="absolute inset-0 w-full h-full object-cover"
          src={currentBackground.url}
        />
      )}

      <div className="absolute inset-0 bg-black bg-opacity-40" />
      
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

      {/* Search Dialog with Keyboard */}
      <Dialog open={state.isSearchOpen} onOpenChange={(open) => {
        if (!open) {
          setState(prev => ({ 
            ...prev, 
            isSearchOpen: false, 
            showKeyboard: false, 
            showSearchResults: false,
            searchQuery: '', 
            searchResults: [] 
          }));
        }
      }}>
        <DialogContent className="max-w-full max-h-full w-screen h-screen bg-gray-900 border-gray-700 p-0">
          {state.showKeyboard && (
            <div className="flex flex-col h-full bg-gray-900">
              <div className="p-6">
                <h2 className="text-3xl font-bold text-white mb-6">Search for Music</h2>
                <div className="bg-gray-800 p-4 rounded-lg mb-6">
                  <Input
                    value={state.searchQuery}
                    readOnly
                    placeholder="Type using the keyboard below..."
                    className="text-2xl p-4 bg-gray-700 text-white border-gray-600"
                  />
                </div>
              </div>
              
              <div className="flex-1 p-6">
                <div className="grid grid-cols-10 gap-3 mb-4">
                  {KEYBOARD_LAYOUT[0].map((key) => (
                    <Button
                      key={key}
                      onClick={() => handleKeyboardInput(key)}
                      className="h-16 text-xl font-bold bg-gray-700 hover:bg-gray-600 text-white border-2 border-gray-500 shadow-lg transform active:scale-95 transition-all"
                    >
                      {key}
                    </Button>
                  ))}
                </div>
                
                <div className="grid grid-cols-9 gap-3 mb-4 ml-8">
                  {KEYBOARD_LAYOUT[1].map((key) => (
                    <Button
                      key={key}
                      onClick={() => handleKeyboardInput(key)}
                      className="h-16 text-xl font-bold bg-gray-700 hover:bg-gray-600 text-white border-2 border-gray-500 shadow-lg transform active:scale-95 transition-all"
                    >
                      {key}
                    </Button>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-3 mb-4 ml-16">
                  {KEYBOARD_LAYOUT[2].map((key) => (
                    <Button
                      key={key}
                      onClick={() => handleKeyboardInput(key)}
                      className="h-16 text-xl font-bold bg-gray-700 hover:bg-gray-600 text-white border-2 border-gray-500 shadow-lg transform active:scale-95 transition-all"
                    >
                      {key}
                    </Button>
                  ))}
                </div>
                
                <div className="flex justify-center gap-6">
                  <Button
                    onClick={() => handleKeyboardInput('SPACE')}
                    className="h-16 px-24 text-xl font-bold bg-gray-700 hover:bg-gray-600 text-white border-2 border-gray-500 shadow-lg transform active:scale-95 transition-all"
                  >
                    SPACE
                  </Button>
                  <Button
                    onClick={() => handleKeyboardInput('BACKSPACE')}
                    className="h-16 px-12 text-xl font-bold bg-red-700 hover:bg-red-600 text-white border-2 border-red-500 shadow-lg transform active:scale-95 transition-all"
                  >
                    ←
                  </Button>
                  <Button
                    onClick={() => handleKeyboardInput('SEARCH')}
                    disabled={!state.searchQuery.trim() || state.isSearching}
                    className="h-16 px-12 text-xl font-bold bg-green-700 hover:bg-green-600 text-white border-2 border-green-500 shadow-lg transform active:scale-95 transition-all"
                  >
                    {state.isSearching ? '...' : 'SEARCH'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {state.showSearchResults && (
            <div className="flex flex-col h-full bg-gray-900">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
                <Button
                  onClick={() => setState(prev => ({ ...prev, showSearchResults: false, showKeyboard: true }))}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Search
                </Button>
                <h2 className="text-2xl font-bold text-white">Search Results</h2>
              </div>
              
              <ScrollArea className="flex-1" style={{ scrollbarWidth: '40px' }}>
                <div className="p-6 grid grid-cols-4 gap-6">
                  {state.searchResults.map((video) => (
                    <Card 
                      key={video.id} 
                      className="cursor-pointer hover:bg-gray-700 transition-colors bg-gray-800 border-gray-600"
                      onClick={() => handleVideoSelect(video)}
                    >
                      <CardContent className="p-4">
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                        <h3 className="font-semibold text-white text-sm line-clamp-2 mb-2">{video.title}</h3>
                        <p className="text-gray-300 text-xs line-clamp-1">{video.channelTitle}</p>
                        {video.officialScore && video.officialScore > 5 && (
                          <Badge variant="secondary" className="mt-2 bg-green-600 text-white">
                            Official
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Enhanced Admin Dialog */}
      <Dialog open={state.isAdminOpen} onOpenChange={(open) => setState(prev => ({ ...prev, isAdminOpen: open }))}>
        <DialogContent className="bg-gradient-to-b from-slate-100 to-slate-200 border-slate-600 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900">Admin Console</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Play Mode
              </label>
              <Select 
                value={state.mode} 
                onValueChange={(value: 'FREEPLAY' | 'PAID') => setState(prev => ({ ...prev, mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREEPLAY">Free Play</SelectItem>
                  <SelectItem value="PAID">Credit Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {state.mode === 'PAID' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Credit Balance: {state.credits}
                </label>
                <div className="flex gap-2 mb-4">
                  <Button 
                    size="sm"
                    onClick={() => {
                      setState(prev => ({ ...prev, credits: prev.credits + 1 }));
                      addLog('CREDIT_ADDED', 'ADMIN CREDIT (+1)', undefined, 1);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    +1
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setState(prev => ({ ...prev, credits: prev.credits + 3 }));
                      addLog('CREDIT_ADDED', 'ADMIN CREDIT (+3)', undefined, 3);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    +3
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setState(prev => ({ ...prev, credits: prev.credits + 5 }));
                      addLog('CREDIT_ADDED', 'ADMIN CREDIT (+5)', undefined, 5);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    +5
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      addLog('CREDIT_REMOVED', `ADMIN CREDIT CLEAR (was ${state.credits})`, undefined, -state.credits);
                      setState(prev => ({ ...prev, credits: 0 }));
                    }}
                    variant="destructive"
                  >
                    Clear(0)
                  </Button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                YouTube API Key
              </label>
              <Input
                value={state.apiKey}
                onChange={(e) => setState(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter YouTube API Key"
                className="font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Main UI Background
              </label>
              <div className="flex gap-2 items-center mb-2">
                <Select 
                  value={state.selectedBackground}
                  onValueChange={(value) => {
                    if (value === 'add-new') {
                      fileInputRef.current?.click();
                    } else {
                      setState(prev => ({ ...prev, selectedBackground: value }));
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.backgrounds.map(bg => (
                      <SelectItem key={bg.id} value={bg.id}>
                        {bg.name} ({bg.type})
                      </SelectItem>
                    ))}
                    <SelectItem value="add-new">
                      <Upload className="w-4 h-4 mr-2" />
                      Add Background...
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cycle-backgrounds"
                    checked={state.cycleBackgrounds}
                    onCheckedChange={(checked) => setState(prev => ({ ...prev, cycleBackgrounds: !!checked }))}
                  />
                  <label htmlFor="cycle-backgrounds" className="text-sm">
                    Cycle Backgrounds
                  </label>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleBackgroundUpload}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coin Acceptor Device
              </label>
              <Select 
                value={state.selectedCoinAcceptor}
                onValueChange={(value) => setState(prev => ({ ...prev, selectedCoinAcceptor: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Device</SelectItem>
                  <SelectItem value="usbserial-1420">USB Serial Device (usbserial-1420)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Activity Log
              </label>
              <ScrollArea className="h-48 border rounded-md p-2 bg-white">
                {state.logs.map((log, index) => (
                  <div key={index} className="text-xs mb-1 border-b pb-1">
                    <span className="text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span className="ml-2 font-semibold">
                      [{log.type}]
                    </span>
                    <span className="ml-2">
                      {log.description}
                    </span>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

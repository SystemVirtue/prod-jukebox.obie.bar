
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Settings } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  officialScore?: number;
}

interface JukeboxState {
  mode: 'FREEPLAY' | 'PAID';
  credits: number;
  currentPlaylist: string[];
  defaultPlaylist: string;
  isSearchOpen: boolean;
  isAdminOpen: boolean;
  searchResults: SearchResult[];
  searchQuery: string;
  isSearching: boolean;
  selectedCoinAcceptor: string;
  playerWindow: Window | null;
}

const API_KEY = 'AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4';
const DEFAULT_PLAYLIST_ID = 'PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH';

const Index = () => {
  const { toast } = useToast();
  const [state, setState] = useState<JukeboxState>({
    mode: 'FREEPLAY',
    credits: 0,
    currentPlaylist: [],
    defaultPlaylist: DEFAULT_PLAYLIST_ID,
    isSearchOpen: false,
    isAdminOpen: false,
    searchResults: [],
    searchQuery: '',
    isSearching: false,
    selectedCoinAcceptor: '',
    playerWindow: null
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    video: SearchResult | null;
  }>({ isOpen: false, video: null });

  // Initialize player window on component mount
  useEffect(() => {
    const playerWindow = window.open('/player.html', 'JukeboxPlayer', 
      'width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no');
    
    if (playerWindow) {
      setState(prev => ({ ...prev, playerWindow }));
      console.log('Player window opened successfully');
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

  // Listen for coin acceptor input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (state.mode === 'PAID') {
        if (event.key === 'a') {
          setState(prev => ({ ...prev, credits: prev.credits + 1 }));
          toast({ title: "Credit Added", description: "+1 Credit" });
        } else if (event.key === 'b') {
          setState(prev => ({ ...prev, credits: prev.credits + 3 }));
          toast({ title: "Credits Added", description: "+3 Credits" });
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [state.mode, toast]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    // Check for admin access
    if (query.toUpperCase() === 'ADMIN') {
      setState(prev => ({ ...prev, isAdminOpen: true, searchQuery: '' }));
      return;
    }

    setState(prev => ({ ...prev, isSearching: true, searchResults: [] }));

    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=50&key=${API_KEY}`;
      
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

    // Add to playlist
    setState(prev => ({
      ...prev,
      currentPlaylist: [...prev.currentPlaylist, confirmDialog.video!.id],
      credits: prev.mode === 'PAID' ? Math.max(0, prev.credits - 1) : prev.credits
    }));

    // Send to player
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

    toast({
      title: "Song Added",
      description: `"${confirmDialog.video.title}" added to playlist`,
    });

    setConfirmDialog({ isOpen: false, video: null });
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ 
        backgroundImage: `url('/lovable-uploads/8948bfb8-e172-4535-bd9b-76f9d1c35307.png')`,
        backgroundSize: 'cover'
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen p-8 flex flex-col">
        {/* Header with Credits */}
        <div className="flex justify-end mb-8">
          <Card className="bg-amber-900/90 border-amber-600 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="text-amber-100 font-bold text-xl">
                CREDIT: {state.mode === 'FREEPLAY' ? 'Free Play' : state.credits}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-amber-200 drop-shadow-2xl mb-4">
            MUSIC JUKEBOX
          </h1>
          <p className="text-2xl text-amber-100 drop-shadow-lg">
            Touch to Select Your Music
          </p>
        </div>

        {/* Main Search Button */}
        <div className="flex-1 flex items-center justify-center">
          <Button
            onClick={() => setState(prev => ({ ...prev, isSearchOpen: true }))}
            className="w-96 h-24 text-3xl font-bold bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-amber-900 shadow-2xl transform hover:scale-105 transition-all duration-200 border-4 border-amber-500"
          >
            🎵 Search for Music 🎵
          </Button>
        </div>

        {/* Admin Button */}
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

      {/* Search Dialog */}
      <Dialog open={state.isSearchOpen} onOpenChange={(open) => setState(prev => ({ ...prev, isSearchOpen: open, searchQuery: '', searchResults: [] }))}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-gradient-to-b from-amber-50 to-amber-100 border-amber-600">
          <DialogHeader>
            <DialogTitle className="text-2xl text-amber-900">Search for Music</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter song or artist..."
                value={state.searchQuery}
                onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && performSearch(state.searchQuery)}
                className="flex-1 text-lg p-3"
              />
              <Button 
                onClick={() => performSearch(state.searchQuery)}
                disabled={state.isSearching}
                className="px-8 bg-amber-600 hover:bg-amber-700"
              >
                {state.isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.searchResults.map((video) => (
                <Card 
                  key={video.id} 
                  className="cursor-pointer hover:bg-amber-200 transition-colors border-amber-300"
                  onClick={() => handleVideoSelect(video)}
                >
                  <CardContent className="p-4 flex gap-3">
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title}
                      className="w-24 h-18 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-amber-900 truncate">{video.title}</h3>
                      <p className="text-amber-700 text-sm truncate">{video.channelTitle}</p>
                      {video.officialScore && video.officialScore > 5 && (
                        <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800">
                          Official
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
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

      {/* Admin Dialog */}
      <Dialog open={state.isAdminOpen} onOpenChange={(open) => setState(prev => ({ ...prev, isAdminOpen: open }))}>
        <DialogContent className="bg-gradient-to-b from-slate-100 to-slate-200 border-slate-600">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900">Admin Console</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default Playlist
              </label>
              <Select 
                value={state.defaultPlaylist}
                onValueChange={(value) => setState(prev => ({ ...prev, defaultPlaylist: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_PLAYLIST_ID}>OutsideObie2113 - Default Mix</SelectItem>
                  <SelectItem value="PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH">Classic Rock Mix</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="usb0">USB Serial Device 0</SelectItem>
                  <SelectItem value="usb1">USB Serial Device 1</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {state.mode === 'PAID' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Manual Credit Control
                </label>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, credits: prev.credits + 1 }))}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    +1 Credit
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, credits: Math.max(0, prev.credits - 1) }))}
                    variant="outline"
                  >
                    -1 Credit
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, credits: 0 }))}
                    variant="destructive"
                  >
                    Reset
                  </Button>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Current Credits: {state.credits}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

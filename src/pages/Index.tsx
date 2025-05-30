import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInterface } from '../components/SearchInterface';
import { AdminConsole } from '../components/AdminConsole';
import { InsufficientCreditsDialog } from '../components/InsufficientCreditsDialog';
import { DuplicateSongDialog } from '../components/DuplicateSongDialog';
import { BackgroundManager } from '../components/BackgroundManager';
import { PlaylistManager } from '../components/PlaylistManager';
import { SerialCommunication } from '../components/SerialCommunication';
import { Settings, Music, Coins, Volume2 } from 'lucide-react';

interface YouTubeSearchResult {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
  };
}

interface PlaylistItem {
  id: string;
  title: string;
  channelTitle: string;
  videoId: string;
  isNowPlaying?: boolean;
  isUserRequest?: boolean;
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

interface QueuedRequest {
  id: string;
  title: string;
  channelTitle: string;
  videoId: string;
  timestamp: string;
}

const DEFAULT_BACKGROUNDS: BackgroundFile[] = [
  { id: 'default-1', name: 'Stars', url: '/stars.mp4', type: 'video' },
  { id: 'default-2', name: 'Cityscape', url: '/cityscape.mp4', type: 'video' },
  { id: 'default-3', name: 'Aurora', url: '/aurora.mp4', type: 'video' },
  { id: 'default-4', name: 'Synthwave', url: '/synthwave.gif', type: 'image' },
  { id: 'default-5', name: 'Arcade', url: '/arcade.gif', type: 'image' },
];

// Helper function to clean title text by removing content in brackets
const cleanTitle = (title: string): string => {
  return title.replace(/\([^)]*\)/g, '').trim();
};

const Index = () => {
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [searchText, setSearchText] = useState('');
  const [adminConsoleOpen, setAdminConsoleOpen] = useState(false);
  const [insufficientCreditsOpen, setInsufficientCreditsOpen] = useState(false);
  const [duplicateSongOpen, setDuplicateSongOpen] = useState(false);
  const [duplicateSongTitle, setDuplicateSongTitle] = useState('');
  const [duplicateSongChannel, setDuplicateSongChannel] = useState('');
  const [mode, setMode] = useState<'FREEPLAY' | 'PAID'>('FREEPLAY');
  const [credits, setCredits] = useState(0);
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '');
  const [selectedCoinAcceptor, setSelectedCoinAcceptor] = useState('none');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditHistory[]>([]);
  const [backgrounds, setBackgrounds] = useState<BackgroundFile[]>(DEFAULT_BACKGROUNDS);
  const [selectedBackground, setSelectedBackground] = useState(DEFAULT_BACKGROUNDS[0].id);
  const [cycleBackgrounds, setCycleBackgrounds] = useState(false);
  const [bounceVideos, setBounceVideos] = useState(false);
  const [playerWindow, setPlayerWindow] = useState<Window | null>(null);
  const [isPlayerRunning, setIsPlayerRunning] = useState(false);
  const [maxSongLength, setMaxSongLength] = useState(10);
  const [defaultPlaylist, setDefaultPlaylist] = useState('PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH');
  const [currentPlaylistVideos, setCurrentPlaylistVideos] = useState<PlaylistItem[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string>('Loading...');
  const [priorityQueue, setPriorityQueue] = useState<QueuedRequest[]>([]);
  const [showMiniPlayer, setShowMiniPlayer] = useState(true);

  const serialRef = useRef<SerialCommunication>(null);

  // Function to add a log entry
  const addLog = (type: LogEntry['type'], description: string, videoId?: string, creditAmount?: number) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      description,
      videoId,
      creditAmount,
    };
    setLogs(prevLogs => [newLog, ...prevLogs]);
  };

  // Function to add a user request
  const addUserRequest = (title: string, videoId: string, channelTitle: string) => {
    const newRequest: UserRequest = {
      timestamp: new Date().toISOString(),
      title,
      videoId,
      channelTitle,
    };
    setUserRequests(prevRequests => [newRequest, ...prevRequests]);
  };

  // Function to add a credit history entry
  const addCreditHistory = (amount: number, type: 'ADDED' | 'REMOVED', description: string) => {
    const newCreditEntry: CreditHistory = {
      timestamp: new Date().toISOString(),
      amount,
      type,
      description,
    };
    setCreditHistory(prevHistory => [newCreditEntry, ...prevHistory]);
  };

  // Function to handle background upload
  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newBackground: BackgroundFile = {
        id: `custom-${Date.now()}`,
        name: file.name,
        url,
        type: file.type.startsWith('image') ? 'image' : 'video',
      };
      setBackgrounds(prevBackgrounds => [...prevBackgrounds, newBackground]);
      setSelectedBackground(newBackground.id);
    }
  };

  // Function to handle background change
  const handleBackgroundChange = (id: string) => {
    setSelectedBackground(id);
  };

  // Function to toggle background cycling
  const handleCycleBackgroundsChange = (cycle: boolean) => {
    setCycleBackgrounds(cycle);
  };

  // Function to toggle video bouncing
  const handleBounceVideosChange = (bounce: boolean) => {
    setBounceVideos(bounce);
  };

  // Function to handle API key change
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
  };

  // Function to handle coin acceptor change
  const handleCoinAcceptorChange = (device: string) => {
    setSelectedCoinAcceptor(device);
  };

  // Function to handle mode change
  const handleModeChange = (newMode: 'FREEPLAY' | 'PAID') => {
    setMode(newMode);
  };

  // Function to handle credits change
  const handleCreditsChange = (newCredits: number) => {
    setCredits(newCredits);
  };

  // Function to handle max song length change
  const handleMaxSongLengthChange = (minutes: number) => {
    setMaxSongLength(minutes);
  };

  // Function to handle default playlist change
  const handleDefaultPlaylistChange = (playlistId: string) => {
    setDefaultPlaylist(playlistId);
  };

  // Function to handle playlist reorder
  const handlePlaylistReorder = (newPlaylist: PlaylistItem[]) => {
    setCurrentPlaylistVideos(newPlaylist);
  };

  // Function to handle playlist shuffle
  const handlePlaylistShuffle = () => {
    const nowPlaying = currentPlaylistVideos.find(video => video.isNowPlaying);
    const userRequests = currentPlaylistVideos.filter(video => video.isUserRequest);
    const defaultPlaylist = currentPlaylistVideos.filter(video => !video.isUserRequest && !video.isNowPlaying);

    // Shuffle only the default playlist
    const shuffledDefaultPlaylist = [...defaultPlaylist].sort(() => Math.random() - 0.5);

    // Reconstruct the playlist with now playing, user requests, and shuffled default playlist
    const newPlaylist: PlaylistItem[] = [];
    if (nowPlaying) newPlaylist.push(nowPlaying);
    newPlaylist.push(...userRequests);
    newPlaylist.push(...shuffledDefaultPlaylist);

    setCurrentPlaylistVideos(newPlaylist);
  };

  // Function to handle removing a song from the playlist
  const handleRemoveFromPlaylist = (index: number) => {
    const newPlaylist = [...currentPlaylistVideos];
    newPlaylist.splice(index, 1);
    setCurrentPlaylistVideos(newPlaylist);
  };

  // Function to handle player toggle
  const handlePlayerToggle = () => {
    if (!playerWindow || playerWindow.closed) {
      // Open the player window
      const newWindow = window.open('/player', 'JukeboxPlayer', 'width=640,height=360');
      setPlayerWindow(newWindow);

      // Set up a listener for when the window is closed
      const intervalId = setInterval(() => {
        if (!newWindow || newWindow.closed) {
          setIsPlayerRunning(false);
          clearInterval(intervalId);
        }
      }, 500);

      setIsPlayerRunning(true);
    } else {
      // If the player window is already open, close it
      playerWindow.close();
      setIsPlayerRunning(false);
    }
  };

  // Function to handle skip song
  const handleSkipSong = () => {
    if (playerWindow) {
      playerWindow.postMessage({ type: 'SKIP_SONG' }, '*');
      addLog('SONG_PLAYED', 'Song Skipped', currentPlaylistVideos[0]?.videoId);
    }
  };

  // Function to handle show mini player change
  const handleShowMiniPlayerChange = (show: boolean) => {
    setShowMiniPlayer(show);
  };

  // Enhanced function to load ALL playlist items (no 50 item limit)
  const loadPlaylistVideos = useCallback(async (playlistId: string) => {
    if (!apiKey) {
      console.log('No API key available');
      return;
    }

    console.log(`Loading all videos from playlist: ${playlistId}`);
    setCurrentPlaylistVideos([]);
    
    try {
      let allVideos: any[] = [];
      let nextPageToken = '';
      let pageCount = 0;
      const maxPages = 200; // Safety limit to prevent infinite loops (200 pages = ~10,000 videos max)

      do {
        console.log(`Loading playlist page ${pageCount + 1}${nextPageToken ? ` (token: ${nextPageToken.substring(0, 10)}...)` : ''}`);
        
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&key=${apiKey}&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const pageVideos = data.items
            .filter((item: any) => item.snippet?.videoOwnerChannelTitle && item.snippet?.resourceId?.videoId)
            .map((item: any) => ({
              id: `${item.snippet.resourceId.videoId}-${Date.now()}-${Math.random()}`,
              title: cleanTitle(item.snippet.title),
              channelTitle: item.snippet.videoOwnerChannelTitle,
              videoId: item.snippet.resourceId.videoId,
              isUserRequest: false,
              isNowPlaying: false
            }));
          
          allVideos = [...allVideos, ...pageVideos];
          console.log(`Page ${pageCount + 1}: Added ${pageVideos.length} videos (total: ${allVideos.length})`);
        }
        
        nextPageToken = data.nextPageToken || '';
        pageCount++;
        
        // Safety check to prevent infinite loops
        if (pageCount >= maxPages) {
          console.warn(`Reached maximum page limit (${maxPages}). Stopping playlist load.`);
          break;
        }
        
      } while (nextPageToken);

      console.log(`Playlist loading complete. Total videos loaded: ${allVideos.length}`);
      setCurrentPlaylistVideos(allVideos);
      
    } catch (error) {
      console.error('Error loading playlist:', error);
      setCurrentPlaylistVideos([]);
    }
  }, [apiKey]);

  // Initial load of playlist videos
  useEffect(() => {
    if (defaultPlaylist) {
      loadPlaylistVideos(defaultPlaylist);
    }
  }, [defaultPlaylist, loadPlaylistVideos]);

  // Effect to send state updates to the player window
  useEffect(() => {
    if (playerWindow && !playerWindow.closed) {
      playerWindow.postMessage({
        type: 'UPDATE_STATE',
        payload: {
          mode,
          credits,
          apiKey,
          selectedCoinAcceptor,
          maxSongLength,
          defaultPlaylist,
          currentPlaylistVideos,
          currentlyPlaying,
          priorityQueue,
          showMiniPlayer,
        }
      }, '*');
    }
  }, [mode, credits, apiKey, selectedCoinAcceptor, maxSongLength, defaultPlaylist, currentPlaylistVideos, currentlyPlaying, priorityQueue, showMiniPlayer, playerWindow]);

  // Effect to handle messages from the player window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'SONG_ENDED') {
        // Remove the song that just finished playing
        setCurrentPlaylistVideos(prevVideos => {
          const newPlaylist = [...prevVideos];
          newPlaylist.shift(); // Remove the first song
          return newPlaylist;
        });
      } else if (event.data.type === 'CREDIT_DEDUCTED') {
        // Deduct credits when a song is played in PAID mode
        setCredits(prevCredits => Math.max(0, prevCredits - 1));
        addCreditHistory(-1, 'REMOVED', 'SONG PLAYED');
      } else if (event.data.type === 'UPDATE_NOW_PLAYING') {
        setCurrentlyPlaying(event.data.title);
      } else if (event.data.type === 'ADD_TO_PLAYLIST') {
        const { title, videoId, channelTitle } = event.data;

        // Check if the song is already in the playlist
        const isDuplicate = currentPlaylistVideos.some(video => video.videoId === videoId);
        if (isDuplicate) {
          setDuplicateSongTitle(title);
          setDuplicateSongChannel(channelTitle);
          setDuplicateSongOpen(true);
          return;
        }

        if (mode === 'PAID' && credits <= 0) {
          setInsufficientCreditsOpen(true);
          return;
        }

        // Add the song to the priority queue
        const newRequest: QueuedRequest = {
          id: `${videoId}-${Date.now()}-${Math.random()}`,
          title,
          videoId,
          channelTitle,
          timestamp: new Date().toISOString(),
        };
        setPriorityQueue(prevQueue => [newRequest, ...prevQueue]);

        // Add the song to the playlist with isUserRequest flag
        const newPlaylistItem: PlaylistItem = {
          id: `${videoId}-${Date.now()}-${Math.random()}`,
          title,
          videoId,
          channelTitle,
          isUserRequest: true,
        };
        setCurrentPlaylistVideos(prevVideos => [...prevVideos, newPlaylistItem]);

        // Deduct credits if in PAID mode
        if (mode === 'PAID') {
          setCredits(prevCredits => prevCredits - 1);
          addCreditHistory(-1, 'REMOVED', `USER REQUEST: ${title}`);
          addLog('USER_SELECTION', `User selected: ${title}`, videoId, -1);
        } else {
          addLog('USER_SELECTION', `User selected: ${title}`, videoId);
        }
        addUserRequest(title, videoId, channelTitle);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [credits, mode, currentPlaylistVideos, addLog, addUserRequest]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundManager
        backgrounds={backgrounds}
        selectedBackground={selectedBackground}
        cycleBackgrounds={cycleBackgrounds}
        bounceVideos={bounceVideos}
      />

      <div className="absolute top-4 left-4 z-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-500" />
              Jukebox
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                <Coins className="w-3 h-3 mr-1" />
                {mode === 'PAID' ? `${credits} Credits` : 'Free Play'}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAdminConsoleOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-500" />
              Volume Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SerialCommunication ref={serialRef} />
          </CardContent>
        </Card>
      </div>

      <div className="container mx-auto py-24 px-4 relative z-10">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Search for a Song</CardTitle>
          </CardHeader>
          <CardContent>
            <SearchInterface
              setSearchResults={setSearchResults}
              searchText={searchText}
              setSearchText={setSearchText}
              apiKey={apiKey}
            />
            <div className="mt-4">
              {searchResults.map((result) => (
                <div key={result.id.videoId} className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{cleanTitle(result.snippet.title)}</div>
                    <div className="text-sm text-gray-500">{result.snippet.channelTitle}</div>
                  </div>
                  <Button
                    onClick={() => {
                      // Check if the song is already in the playlist
                      const isDuplicate = currentPlaylistVideos.some(video => video.videoId === result.id.videoId);
                      if (isDuplicate) {
                        setDuplicateSongTitle(result.snippet.title);
                        setDuplicateSongChannel(result.snippet.channelTitle);
                        setDuplicateSongOpen(true);
                        return;
                      }

                      if (mode === 'PAID' && credits <= 0) {
                        setInsufficientCreditsOpen(true);
                        return;
                      }

                      // Add the song to the priority queue
                      const newRequest: QueuedRequest = {
                        id: `${result.id.videoId}-${Date.now()}-${Math.random()}`,
                        title: result.snippet.title,
                        videoId: result.id.videoId,
                        channelTitle: result.snippet.channelTitle,
                        timestamp: new Date().toISOString(),
                      };
                      setPriorityQueue(prevQueue => [newRequest, ...prevQueue]);

                      // Add the song to the playlist with isUserRequest flag
                      const newPlaylistItem: PlaylistItem = {
                        id: `${result.id.videoId}-${Date.now()}-${Math.random()}`,
                        title: result.snippet.title,
                        videoId: result.id.videoId,
                        channelTitle: result.snippet.channelTitle,
                        isUserRequest: true,
                      };
                      setCurrentPlaylistVideos(prevVideos => [...prevVideos, newPlaylistItem]);

                      // Deduct credits if in PAID mode
                      if (mode === 'PAID') {
                        setCredits(prevCredits => prevCredits - 1);
                        addCreditHistory(-1, 'REMOVED', `USER REQUEST: ${result.snippet.title}`);
                        addLog('USER_SELECTION', `User selected: ${result.snippet.title}`, result.id.videoId, -1);
                      } else {
                        addLog('USER_SELECTION', `User selected: ${result.snippet.title}`, result.id.videoId);
                      }
                      addUserRequest(result.snippet.title, result.id.videoId, result.snippet.channelTitle);
                    }}
                    size="sm"
                  >
                    Add to Playlist
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminConsole
        isOpen={adminConsoleOpen}
        onClose={() => setAdminConsoleOpen(false)}
        mode={mode}
        onModeChange={handleModeChange}
        credits={credits}
        onCreditsChange={handleCreditsChange}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        selectedCoinAcceptor={selectedCoinAcceptor}
        onCoinAcceptorChange={handleCoinAcceptorChange}
        logs={logs}
        userRequests={userRequests}
        creditHistory={creditHistory}
        backgrounds={backgrounds}
        selectedBackground={selectedBackground}
        onBackgroundChange={handleBackgroundChange}
        cycleBackgrounds={cycleBackgrounds}
        onCycleBackgroundsChange={handleCycleBackgroundsChange}
        bounceVideos={bounceVideos}
        onBounceVideosChange={handleBounceVideosChange}
        onBackgroundUpload={handleBackgroundUpload}
        onAddLog={addLog}
        onAddUserRequest={addUserRequest}
        onAddCreditHistory={addCreditHistory}
        playerWindow={playerWindow}
        isPlayerRunning={isPlayerRunning}
        onPlayerToggle={handlePlayerToggle}
        onSkipSong={handleSkipSong}
        maxSongLength={maxSongLength}
        onMaxSongLengthChange={handleMaxSongLengthChange}
        defaultPlaylist={defaultPlaylist}
        onDefaultPlaylistChange={handleDefaultPlaylistChange}
        currentPlaylistVideos={currentPlaylistVideos}
        onPlaylistReorder={handlePlaylistReorder}
        onPlaylistShuffle={handlePlaylistShuffle}
        currentlyPlaying={currentlyPlaying}
        priorityQueue={priorityQueue}
        showMiniPlayer={showMiniPlayer}
        onShowMiniPlayerChange={handleShowMiniPlayerChange}
        onRemoveFromPlaylist={handleRemoveFromPlaylist}
      />

      <InsufficientCreditsDialog
        isOpen={insufficientCreditsOpen}
        onClose={() => setInsufficientCreditsOpen(false)}
      />

      <DuplicateSongDialog
        isOpen={duplicateSongOpen}
        onClose={() => setDuplicateSongOpen(false)}
        title={duplicateSongTitle}
        channel={duplicateSongChannel}
      />
    </div>
  );
};

export default Index;

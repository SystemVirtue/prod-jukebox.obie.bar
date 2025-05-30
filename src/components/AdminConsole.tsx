
import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Upload, Play, Pause, SkipForward, Download, List } from 'lucide-react';

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

interface PlaylistInfo {
  id: string;
  title: string;
}

interface BackgroundFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
}

interface AdminConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'FREEPLAY' | 'PAID';
  onModeChange: (mode: 'FREEPLAY' | 'PAID') => void;
  credits: number;
  onCreditsChange: (credits: number) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  selectedCoinAcceptor: string;
  onCoinAcceptorChange: (device: string) => void;
  logs: LogEntry[];
  userRequests: UserRequest[];
  creditHistory: CreditHistory[];
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  onBackgroundChange: (id: string) => void;
  cycleBackgrounds: boolean;
  onCycleBackgroundsChange: (cycle: boolean) => void;
  onBackgroundUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddLog: (type: LogEntry['type'], description: string, videoId?: string, creditAmount?: number) => void;
  onAddUserRequest: (title: string, videoId: string, channelTitle: string) => void;
  onAddCreditHistory: (amount: number, type: 'ADDED' | 'REMOVED', description: string) => void;
  playerWindow: Window | null;
  isPlayerRunning: boolean;
  onPlayerToggle: () => void;
  onSkipSong: () => void;
  maxSongLength: number;
  onMaxSongLengthChange: (minutes: number) => void;
  defaultPlaylist: string;
  onDefaultPlaylistChange: (playlistId: string) => void;
  currentPlaylistVideos: any[];
}

const AVAILABLE_PLAYLISTS: PlaylistInfo[] = [
  { id: 'PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH', title: 'Obie Playlist' },
  { id: 'PLN9QqCogPsXLAtgvLQ0tvpLv820R7PQsM', title: 'Playlist 1' },
  { id: 'PLN9QqCogPsXLsv5D5ZswnOSnRIbGU80IS', title: 'Playlist 2' },
  { id: 'PLN9QqCogPsXKZsYwYEpHKUhjCJlvVB44h', title: 'Playlist 3' },
  { id: 'PLN9QqCogPsXIqfwdfe4hf3qWM1mFweAXP', title: 'Playlist 4' }
];

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
  credits,
  onCreditsChange,
  apiKey,
  onApiKeyChange,
  selectedCoinAcceptor,
  onCoinAcceptorChange,
  logs,
  userRequests,
  creditHistory,
  backgrounds,
  selectedBackground,
  onBackgroundChange,
  cycleBackgrounds,
  onCycleBackgroundsChange,
  onBackgroundUpload,
  onAddLog,
  onAddUserRequest,
  onAddCreditHistory,
  playerWindow,
  isPlayerRunning,
  onPlayerToggle,
  onSkipSong,
  maxSongLength,
  onMaxSongLengthChange,
  defaultPlaylist,
  onDefaultPlaylistChange,
  currentPlaylistVideos
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [playlistTitles, setPlaylistTitles] = useState<{ [key: string]: string }>({});

  // Load playlist titles on mount
  useEffect(() => {
    const loadPlaylistTitles = async () => {
      const titles: { [key: string]: string } = {};
      
      for (const playlist of AVAILABLE_PLAYLISTS) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlist.id}&key=${apiKey}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
              titles[playlist.id] = data.items[0].snippet.title;
            } else {
              titles[playlist.id] = playlist.title;
            }
          } else {
            titles[playlist.id] = playlist.title;
          }
        } catch (error) {
          console.error(`Error loading playlist ${playlist.id}:`, error);
          titles[playlist.id] = playlist.title;
        }
      }
      
      setPlaylistTitles(titles);
    };

    if (apiKey && isOpen) {
      loadPlaylistTitles();
    }
  }, [apiKey, isOpen]);

  const handleBackgroundSelectChange = (value: string) => {
    if (value === 'add-new') {
      fileInputRef.current?.click();
    } else {
      onBackgroundChange(value);
    }
  };

  const exportLogs = (logType: 'event' | 'user_requests' | 'credit_history') => {
    let content = '';
    let filename = '';
    
    switch (logType) {
      case 'event':
        content = logs.map(log => 
          `${log.timestamp} [${log.type}] ${log.description}${log.videoId ? ` (${log.videoId})` : ''}${log.creditAmount ? ` Amount: ${log.creditAmount}` : ''}`
        ).join('\n');
        filename = 'event_log.txt';
        break;
      case 'user_requests':
        content = userRequests.map(req => 
          `${req.timestamp} "${req.title}" by ${req.channelTitle} (${req.videoId})`
        ).join('\n');
        filename = 'user_requests.txt';
        break;
      case 'credit_history':
        content = creditHistory.map(credit => 
          `${credit.timestamp} ${credit.type} ${credit.amount} - ${credit.description}`
        ).join('\n');
        filename = 'credit_history.txt';
        break;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gradient-to-b from-slate-100 to-slate-200 border-slate-600 max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900">Admin Console</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Play Mode
              </label>
              <Select value={mode} onValueChange={onModeChange}>
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
              <Select value={defaultPlaylist} onValueChange={onDefaultPlaylistChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PLAYLISTS.map(playlist => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlistTitles[playlist.id] || playlist.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowPlaylistDialog(true)}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                size="sm"
              >
                <List className="w-4 h-4" />
                Show Playlist
              </Button>
            </div>

            {mode === 'PAID' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Credit Balance: {credits}
                </label>
                <div className="flex gap-2 mb-4">
                  <Button 
                    size="sm"
                    onClick={() => {
                      onCreditsChange(credits + 1);
                      onAddLog('CREDIT_ADDED', 'ADMIN CREDIT (+1)', undefined, 1);
                      onAddCreditHistory(1, 'ADDED', 'ADMIN CREDIT (+1)');
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    +1
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      onCreditsChange(credits + 3);
                      onAddLog('CREDIT_ADDED', 'ADMIN CREDIT (+3)', undefined, 3);
                      onAddCreditHistory(3, 'ADDED', 'ADMIN CREDIT (+3)');
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    +3
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      onCreditsChange(credits + 5);
                      onAddLog('CREDIT_ADDED', 'ADMIN CREDIT (+5)', undefined, 5);
                      onAddCreditHistory(5, 'ADDED', 'ADMIN CREDIT (+5)');
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    +5
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      onAddLog('CREDIT_REMOVED', `ADMIN CREDIT CLEAR (was ${credits})`, undefined, -credits);
                      onAddCreditHistory(credits, 'REMOVED', `ADMIN CREDIT CLEAR (was ${credits})`);
                      onCreditsChange(0);
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
                Player Controls
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={onPlayerToggle}
                  className={`flex items-center gap-2 ${isPlayerRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isPlayerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlayerRunning ? 'Pause Player' : 'Start Player'}
                </Button>
                <Button
                  onClick={onSkipSong}
                  disabled={!isPlayerRunning}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip Song
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Maximum Song Length: {maxSongLength} minutes
              </label>
              <Slider
                value={[maxSongLength]}
                onValueChange={(value) => onMaxSongLengthChange(value[0])}
                min={6}
                max={15}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>6 min</span>
                <span>15 min</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                YouTube API Key
              </label>
              <Input
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="Enter YouTube API Key"
                className="font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Main UI Background
              </label>
              <div className="flex gap-2 items-center mb-2">
                <Select value={selectedBackground} onValueChange={handleBackgroundSelectChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {backgrounds.map(bg => (
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
                    checked={cycleBackgrounds}
                    onCheckedChange={onCycleBackgroundsChange}
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
                onChange={onBackgroundUpload}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coin Acceptor Device
              </label>
              <Select value={selectedCoinAcceptor} onValueChange={onCoinAcceptorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select device..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Device</SelectItem>
                  <SelectItem value="usbserial-1420">USB Serial Device (usbserial-1420)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Activity Log
                  </label>
                  <Button
                    onClick={() => exportLogs('event')}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </Button>
                </div>
                <ScrollArea className="h-48 border rounded-md p-2 bg-white">
                  {logs.map((log, index) => (
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

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    User Requests
                  </label>
                  <Button
                    onClick={() => exportLogs('user_requests')}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </Button>
                </div>
                <ScrollArea className="h-48 border rounded-md p-2 bg-white">
                  {userRequests.map((request, index) => (
                    <div key={index} className="text-xs mb-1 border-b pb-1">
                      <span className="text-gray-500">
                        {new Date(request.timestamp).toLocaleString()}
                      </span>
                      <div className="font-semibold">
                        {request.title}
                      </div>
                      <div className="text-gray-600">
                        by {request.channelTitle}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Credit History
                  </label>
                  <Button
                    onClick={() => exportLogs('credit_history')}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </Button>
                </div>
                <ScrollArea className="h-48 border rounded-md p-2 bg-white">
                  {creditHistory.map((credit, index) => (
                    <div key={index} className="text-xs mb-1 border-b pb-1">
                      <span className="text-gray-500">
                        {new Date(credit.timestamp).toLocaleString()}
                      </span>
                      <span className={`ml-2 font-semibold ${credit.type === 'ADDED' ? 'text-green-600' : 'text-red-600'}`}>
                        {credit.type === 'ADDED' ? '+' : '-'}{credit.amount}
                      </span>
                      <div className="text-gray-600">
                        {credit.description}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Playlist Dialog */}
      <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-100 to-slate-200 border-slate-600 max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900">
              Current Playlist ({currentPlaylistVideos.length} songs)
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96 border rounded-md p-4 bg-white">
            {currentPlaylistVideos.map((video, index) => (
              <div key={video.id} className="flex items-center gap-3 p-2 border-b">
                <span className="text-sm font-mono text-gray-500 w-8">
                  {index + 1}.
                </span>
                <div>
                  <div className="font-semibold text-sm">{video.title}</div>
                  <div className="text-xs text-gray-600">{video.channelTitle}</div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

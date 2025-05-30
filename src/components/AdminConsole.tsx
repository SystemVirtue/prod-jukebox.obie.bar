import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Upload, Play, Pause, SkipForward } from 'lucide-react';

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
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  onBackgroundChange: (id: string) => void;
  cycleBackgrounds: boolean;
  onCycleBackgroundsChange: (cycle: boolean) => void;
  onBackgroundUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddLog: (type: LogEntry['type'], description: string, videoId?: string, creditAmount?: number) => void;
  playerWindow: Window | null;
  isPlayerRunning: boolean;
  onPlayerToggle: () => void;
  onSkipSong: () => void;
  maxSongLength: number;
  onMaxSongLengthChange: (minutes: number) => void;
}

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
  backgrounds,
  selectedBackground,
  onBackgroundChange,
  cycleBackgrounds,
  onCycleBackgroundsChange,
  onBackgroundUpload,
  onAddLog,
  playerWindow,
  isPlayerRunning,
  onPlayerToggle,
  onSkipSong,
  maxSongLength,
  onMaxSongLengthChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackgroundSelectChange = (value: string) => {
    if (value === 'add-new') {
      fileInputRef.current?.click();
    } else {
      onBackgroundChange(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-b from-slate-100 to-slate-200 border-slate-600 max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  +5
                </Button>
                <Button 
                  size="sm"
                  onClick={() => {
                    onAddLog('CREDIT_REMOVED', `ADMIN CREDIT CLEAR (was ${credits})`, undefined, -credits);
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
                {isPlayerRunning ? 'Stop Player' : 'Start Player'}
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Activity Log
            </label>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

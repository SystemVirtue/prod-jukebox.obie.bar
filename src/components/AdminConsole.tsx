import React, { useRef, useState, useEffect } from "react";
import { youtubeQuotaService, QuotaUsage } from "@/services/youtubeQuota";
import { testApiKey, ApiKeyTestResult } from "@/utils/apiKeyTester";
import { displayManager, DisplayInfo } from "@/services/displayManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Upload,
  Play,
  Pause,
  SkipForward,
  Download,
  List,
  GripVertical,
  X,
  Shuffle,
  Clock,
  Users,
  Monitor,
  Timer,
  Coins,
  Settings2,
  ExternalLink,
  Maximize,
  Minimize,
} from "lucide-react";

// Helper function to clean title text by removing content in brackets
const cleanTitle = (title: string): string => {
  return title.replace(/\([^)]*\)/g, "").trim();
};

interface LogEntry {
  timestamp: string;
  type: "SONG_PLAYED" | "USER_SELECTION" | "CREDIT_ADDED" | "CREDIT_REMOVED";
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
  type: "ADDED" | "REMOVED";
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
  type: "image" | "video";
}

interface QueuedRequest {
  id: string;
  title: string;
  channelTitle: string;
  videoId: string;
  timestamp: string;
}

interface AdminConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "FREEPLAY" | "PAID";
  onModeChange: (mode: "FREEPLAY" | "PAID") => void;
  credits: number;
  onCreditsChange: (credits: number) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  selectedApiKeyOption: string;
  onApiKeyOptionChange: (option: string) => void;
  customApiKey: string;
  onCustomApiKeyChange: (key: string) => void;
  autoRotateApiKeys: boolean;
  onAutoRotateChange: (enabled: boolean) => void;
  rotationHistory: Array<{
    timestamp: string;
    from: string;
    to: string;
    reason: string;
  }>;
  lastRotationTime: string;
  searchMethod: "youtube_api" | "ytmusic_api";
  onSearchMethodChange: (method: "youtube_api" | "ytmusic_api") => void;
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
  bounceVideos: boolean;
  onBounceVideosChange: (bounce: boolean) => void;
  onBackgroundUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddLog: (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number,
  ) => void;
  onAddUserRequest: (
    title: string,
    videoId: string,
    channelTitle: string,
  ) => void;
  onAddCreditHistory: (
    amount: number,
    type: "ADDED" | "REMOVED",
    description: string,
  ) => void;
  playerWindow: Window | null;
  isPlayerRunning: boolean;
  onPlayerToggle: () => void;
  onSkipSong: () => void;
  onInitializePlayer: () => void;
  maxSongLength: number;
  onMaxSongLengthChange: (minutes: number) => void;
  defaultPlaylist: string;
  onDefaultPlaylistChange: (playlistId: string) => void;
  currentPlaylistVideos: any[];
  onPlaylistReorder?: (newPlaylist: any[]) => void;
  onPlaylistShuffle?: () => void;
  currentlyPlaying: string;
  priorityQueue: QueuedRequest[];
  showMiniPlayer: boolean;
  onShowMiniPlayerChange: (show: boolean) => void;
  testMode: boolean;
  onTestModeChange: (testMode: boolean) => void;
  coinValueA: number;
  onCoinValueAChange: (value: number) => void;
  coinValueB: number;
  onCoinValueBChange: (value: number) => void;
}

const AVAILABLE_PLAYLISTS: PlaylistInfo[] = [
  { id: "PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH", title: "Obie Playlist" },
  { id: "PLN9QqCogPsXLAtgvLQ0tvpLv820R7PQsM", title: "Playlist 1" },
  { id: "PLN9QqCogPsXLsv5D5ZswnOSnRIbGU80IS", title: "Playlist 2" },
  { id: "PLN9QqCogPsXKZsYwYEpHKUhjCJlvVB44h", title: "Playlist 3" },
  { id: "PLN9QqCogPsXIqfwdfe4hf3qWM1mFweAXP", title: "Playlist 4" },
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
  selectedApiKeyOption,
  onApiKeyOptionChange,
  customApiKey,
  onCustomApiKeyChange,
  autoRotateApiKeys,
  onAutoRotateChange,
  rotationHistory,
  lastRotationTime,
  searchMethod,
  onSearchMethodChange,
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
  bounceVideos,
  onBounceVideosChange,
  onBackgroundUpload,
  onAddLog,
  onAddUserRequest,
  onAddCreditHistory,
  playerWindow,
  isPlayerRunning,
  onPlayerToggle,
  onSkipSong,
  onInitializePlayer,
  maxSongLength,
  onMaxSongLengthChange,
  defaultPlaylist,
  onDefaultPlaylistChange,
  currentPlaylistVideos,
  onPlaylistReorder,
  onPlaylistShuffle,
  currentlyPlaying,
  priorityQueue,
  showMiniPlayer,
  onShowMiniPlayerChange,
  testMode,
  onTestModeChange,
  coinValueA,
  onCoinValueAChange,
  coinValueB,
  onCoinValueBChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage>({
    used: 0,
    limit: 10000,
    percentage: 0,
    lastUpdated: "",
  });
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] =
    useState<ApiKeyTestResult | null>(null);
  const [testingApiKey, setTestingApiKey] = useState(false);

  // API Key mappings
  const API_KEY_OPTIONS = {
    key1: "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4",
    key2: "AIzaSyCKHHGkaztp8tfs2BVxiny0InE_z-kGDtY",
    key3: "AIzaSyDy6_QI9SP5nOZRVoNa5xghSHtY3YWX5kU",
    key4: "AIzaSyCPAY_ukeGnAGJdCvYk1bVVDxZjQRJqsdk",
    custom: customApiKey,
  };

  // Load quota usage when API key changes
  useEffect(() => {
    if (apiKey && isOpen) {
      handleRefreshQuota();
    }
  }, [apiKey, isOpen]);

  const handleRefreshQuota = async () => {
    if (!apiKey) return;

    setQuotaLoading(true);
    try {
      const usage = await youtubeQuotaService.checkQuotaUsage(apiKey);
      setQuotaUsage(usage);
    } catch (error) {
      console.error("Failed to fetch quota usage:", error);
    } finally {
      setQuotaLoading(false);
    }
  };

  const handleTestApiKey = async () => {
    if (!apiKey) return;

    setTestingApiKey(true);
    setApiKeyTestResult(null);

    try {
      const result = await testApiKey(apiKey);
      setApiKeyTestResult(result);
    } catch (error) {
      setApiKeyTestResult({
        isValid: false,
        status: 0,
        message: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setTestingApiKey(false);
    }
  };
  const [playlistTitles, setPlaylistTitles] = useState<{
    [key: string]: string;
  }>({});

  // Load playlist titles on mount
  useEffect(() => {
    const loadPlaylistTitles = async () => {
      const titles: { [key: string]: string } = {};

      for (const playlist of AVAILABLE_PLAYLISTS) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlist.id}&key=${apiKey}`,
          );

          if (response.ok) {
            // Track API usage
            youtubeQuotaService.trackApiUsage(apiKey, "playlists", 1);

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
    if (value === "add-new") {
      fileInputRef.current?.click();
    } else {
      onBackgroundChange(value);
    }
  };

  const exportLogs = (
    logType: "event" | "user_requests" | "credit_history",
  ) => {
    let content = "";
    let filename = "";

    switch (logType) {
      case "event":
        content = logs
          .map(
            (log) =>
              `${log.timestamp} [${log.type}] ${log.description}${log.videoId ? ` (${log.videoId})` : ""}${log.creditAmount ? ` Amount: ${log.creditAmount}` : ""}`,
          )
          .join("\n");
        filename = "event_log.txt";
        break;
      case "user_requests":
        content = userRequests
          .map(
            (req) =>
              `${req.timestamp} "${req.title}" by ${req.channelTitle} (${req.videoId})`,
          )
          .join("\n");
        filename = "user_requests.txt";
        break;
      case "credit_history":
        content = creditHistory
          .map(
            (credit) =>
              `${credit.timestamp} ${credit.type} ${credit.amount} - ${credit.description}`,
          )
          .join("\n");
        filename = "credit_history.txt";
        break;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate total playlist length including priority queue
  const getTotalPlaylistLength = () => {
    const defaultPlaylistLength = currentPlaylistVideos.filter(
      (video) => !video.isUserRequest && !video.isNowPlaying,
    ).length;
    return priorityQueue.length + defaultPlaylistLength;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gradient-to-b from-slate-100 to-slate-200 border-slate-600 max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900">
              Admin Console
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Test Mode - At the top */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-5 h-5 text-yellow-600" />
                <label className="text-sm font-medium text-yellow-800">
                  Test Mode
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="test-mode"
                  checked={testMode}
                  onCheckedChange={onTestModeChange}
                />
                <label htmlFor="test-mode" className="text-sm text-yellow-700">
                  TEST_MODE - 20 sec videos (Videos play for only 20 seconds
                  before auto-advancing)
                </label>
              </div>
            </div>

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

            {/* Coin Acceptor Configuration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coin Acceptor Device
              </label>
              <Select
                value={selectedCoinAcceptor}
                onValueChange={onCoinAcceptorChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Device</SelectItem>
                  <SelectItem value="usbserial-1420">
                    USB Serial Device (usbserial-1420)
                  </SelectItem>
                </SelectContent>
              </Select>

              {selectedCoinAcceptor && selectedCoinAcceptor !== "none" && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-medium text-blue-800">
                      Coin Values Configuration
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">
                        "a" character adds:
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={coinValueA ?? 3}
                        onChange={(e) =>
                          onCoinValueAChange(parseInt(e.target.value) || 1)
                        }
                        className="w-full"
                      />
                      <span className="text-xs text-blue-600">credit(s)</span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">
                        "b" character adds:
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={coinValueB ?? 1}
                        onChange={(e) =>
                          onCoinValueBChange(parseInt(e.target.value) || 3)
                        }
                        className="w-full"
                      />
                      <span className="text-xs text-blue-600">credit(s)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default Playlist
              </label>
              <Select
                value={defaultPlaylist}
                onValueChange={onDefaultPlaylistChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PLAYLISTS.map((playlist) => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlistTitles[playlist.id] || playlist.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => setShowPlaylistDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                  size="sm"
                >
                  <List className="w-4 h-4" />
                  Show Queue (
                  {
                    currentPlaylistVideos.filter(
                      (v) => !v.isUserRequest && !v.isNowPlaying,
                    ).length
                  }{" "}
                  songs)
                </Button>
                <Button
                  onClick={onPlaylistShuffle}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                  size="sm"
                >
                  <Shuffle className="w-4 h-4" />
                  Shuffle
                </Button>
              </div>
            </div>

            {mode === "PAID" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Credit Balance: {credits}
                </label>
                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      onCreditsChange(credits + 1);
                      onAddLog(
                        "CREDIT_ADDED",
                        "ADMIN CREDIT (+1)",
                        undefined,
                        1,
                      );
                      onAddCreditHistory(1, "ADDED", "ADMIN CREDIT (+1)");
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    +1
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onCreditsChange(credits + 3);
                      onAddLog(
                        "CREDIT_ADDED",
                        "ADMIN CREDIT (+3)",
                        undefined,
                        3,
                      );
                      onAddCreditHistory(3, "ADDED", "ADMIN CREDIT (+3)");
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    +3
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onCreditsChange(credits + 5);
                      onAddLog(
                        "CREDIT_ADDED",
                        "ADMIN CREDIT (+5)",
                        undefined,
                        5,
                      );
                      onAddCreditHistory(5, "ADDED", "ADMIN CREDIT (+5)");
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    +5
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onAddLog(
                        "CREDIT_REMOVED",
                        `ADMIN CREDIT CLEAR (was ${credits})`,
                        undefined,
                        -credits,
                      );
                      onAddCreditHistory(
                        credits,
                        "REMOVED",
                        `ADMIN CREDIT CLEAR (was ${credits})`,
                      );
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

              {/* Player Status Indicator */}
              <div className="mb-3 p-2 bg-slate-100 rounded text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      playerWindow && !playerWindow.closed
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  ></div>
                  <span className="font-medium">Player Window:</span>
                  <span
                    className={
                      playerWindow && !playerWindow.closed
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    {playerWindow && !playerWindow.closed
                      ? "Open & Ready"
                      : playerWindow
                        ? "Closed"
                        : "Not Created"}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Status: {isPlayerRunning ? "Running" : "Stopped"}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={onPlayerToggle}
                  className={`flex items-center gap-2 ${isPlayerRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                >
                  {isPlayerRunning ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isPlayerRunning ? "Pause Player" : "Start Player"}
                </Button>
                <Button
                  onClick={onSkipSong}
                  disabled={!isPlayerRunning}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip Song
                </Button>
                <Button
                  onClick={onInitializePlayer}
                  disabled={
                    isPlayerRunning && playerWindow && !playerWindow.closed
                  }
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  title="Manually open/reopen the player window"
                >
                  <Settings2 className="w-4 h-4" />
                  Open Player
                </Button>
              </div>

              {/* Display Management Controls */}
              <DisplayControls
                playerWindow={playerWindow}
                onInitializePlayer={onInitializePlayer}
              />

              {/* Debug Controls */}
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-xs font-medium text-yellow-800 mb-2">
                  Debug Controls:
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      console.log("[Debug] Current player state:", {
                        playerWindow: !!playerWindow,
                        closed: playerWindow?.closed,
                        running: isPlayerRunning,
                      });
                      if (playerWindow) {
                        console.log(
                          "[Debug] Player window details:",
                          playerWindow.location?.href,
                        );
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Log State
                  </Button>
                  <Button
                    onClick={() => {
                      if (playerWindow && !playerWindow.closed) {
                        try {
                          const testCommand = {
                            action: "play",
                            videoId: "dQw4w9WgXcQ",
                            title: "Debug Test Song",
                            artist: "Debug Artist",
                            timestamp: Date.now(),
                          };
                          playerWindow.localStorage.setItem(
                            "jukeboxCommand",
                            JSON.stringify(testCommand),
                          );
                          console.log("[Debug] Test command sent to player");
                        } catch (error) {
                          console.error(
                            "[Debug] Error sending test command:",
                            error,
                          );
                        }
                      } else {
                        console.error(
                          "[Debug] No player window available for test",
                        );
                      }
                    }}
                    size="sm"
                    className="text-xs bg-yellow-600 hover:bg-yellow-700"
                    disabled={!playerWindow || playerWindow.closed}
                  >
                    Test Command
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mini Player
              </label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-mini-player"
                  checked={showMiniPlayer}
                  onCheckedChange={onShowMiniPlayerChange}
                />
                <label
                  htmlFor="show-mini-player"
                  className="text-sm flex items-center gap-2"
                >
                  <Monitor className="w-4 h-4" />
                  Show Mini-Player on Jukebox UI
                </label>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Displays a small synchronized video player on the main UI
                (muted)
              </p>
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
              <div className="space-y-3">
                <Select
                  value={selectedApiKeyOption}
                  onValueChange={onApiKeyOptionChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an API key option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="key1">API Key 1 (Default)</SelectItem>
                    <SelectItem value="key2">API Key 2 (Backup)</SelectItem>
                    <SelectItem value="key3">API Key 3 (Primary)</SelectItem>
                    <SelectItem value="key4">API Key 4 (Secondary)</SelectItem>
                    <SelectItem value="custom">Custom API Key</SelectItem>
                  </SelectContent>
                </Select>

                {selectedApiKeyOption === "custom" && (
                  <Input
                    value={customApiKey}
                    onChange={(e) => onCustomApiKeyChange(e.target.value)}
                    placeholder="Enter custom YouTube API Key"
                    className="font-mono text-sm"
                  />
                )}

                <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      Quota Usage:
                    </span>
                    {quotaLoading ? (
                      <span className="text-xs text-slate-500">
                        Checking...
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-300 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              quotaUsage.percentage >= 90
                                ? "bg-red-500"
                                : quotaUsage.percentage >= 70
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(quotaUsage.percentage, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-600">
                          {quotaUsage.used.toLocaleString()}/
                          {quotaUsage.limit.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({quotaUsage.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRefreshQuota}
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 px-2"
                    >
                      Refresh
                    </Button>
                    <Button
                      onClick={handleTestApiKey}
                      disabled={testingApiKey || !apiKey}
                      size="sm"
                      variant="outline"
                      className="text-xs h-6 px-2"
                    >
                      {testingApiKey ? "Testing..." : "Test Key"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    Active Key:{" "}
                    {apiKey ? `...${apiKey.slice(-8)}` : "None selected"}
                    {quotaUsage.lastUpdated && (
                      <span className="ml-2">
                        (Updated:{" "}
                        {new Date(quotaUsage.lastUpdated).toLocaleTimeString()})
                      </span>
                    )}
                  </p>

                  {apiKeyTestResult && (
                    <div
                      className={`text-xs p-2 rounded ${
                        apiKeyTestResult.isValid
                          ? apiKeyTestResult.quotaUsed
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      <span className="font-medium">
                        {apiKeyTestResult.isValid ? "✓" : "✗"} API Key Test:
                      </span>{" "}
                      {apiKeyTestResult.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={autoRotateApiKeys}
                    onCheckedChange={onAutoRotateChange}
                    id="auto-rotate"
                  />
                  <label
                    htmlFor="auto-rotate"
                    className="text-sm font-medium text-slate-700"
                  >
                    Auto-rotate API keys when quota exhausted
                  </label>
                </div>
                {lastRotationTime && (
                  <span className="text-xs text-slate-500">
                    Last rotation:{" "}
                    {new Date(lastRotationTime).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {rotationHistory.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Recent Rotations:
                  </label>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {rotationHistory.slice(0, 3).map((rotation, index) => (
                      <div
                        key={index}
                        className="text-xs text-slate-600 p-2 bg-slate-100 rounded"
                      >
                        <span className="font-mono">
                          ...{rotation.from} → ...{rotation.to}
                        </span>
                        <span className="ml-2 text-slate-500">
                          {new Date(rotation.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Method
              </label>
              <Select
                value={searchMethod}
                onValueChange={(value: "youtube_api" | "ytmusic_api") =>
                  onSearchMethodChange(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube_api">
                    YouTube Data API v3
                  </SelectItem>
                  <SelectItem value="ytmusic_api">YouTube Music API</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {searchMethod === "youtube_api"
                  ? "Uses official YouTube Data API v3 (requires API key)"
                  : "⚠️ YouTube Music API is not compatible with browser environments. Will fallback to YouTube API."}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Main UI Background
              </label>
              <div className="flex gap-2 items-center mb-2">
                <Select
                  value={selectedBackground}
                  onValueChange={handleBackgroundSelectChange}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {backgrounds.map((bg) => (
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

                <div className="flex items-center gap-4">
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

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="bounce-videos"
                      checked={bounceVideos}
                      onCheckedChange={onBounceVideosChange}
                    />
                    <label htmlFor="bounce-videos" className="text-sm">
                      Bounce Videos
                    </label>
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: "none" }}
                onChange={onBackgroundUpload}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Activity Log
                  </label>
                  <Button
                    onClick={() => exportLogs("event")}
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
                      <span className="ml-2 font-semibold">[{log.type}]</span>
                      <span className="ml-2">{log.description}</span>
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
                    onClick={() => exportLogs("user_requests")}
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
                        {cleanTitle(request.title)}
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
                    onClick={() => exportLogs("credit_history")}
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
                      <span
                        className={`ml-2 font-semibold ${credit.type === "ADDED" ? "text-green-600" : "text-red-600"}`}
                      >
                        {credit.type === "ADDED" ? "+" : "-"}
                        {credit.amount}
                      </span>
                      <div className="text-gray-600">{credit.description}</div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Current Playlist Dialog */}
      <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-100 to-slate-200 border-slate-600 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900 flex items-center justify-between">
              Current Queue ({getTotalPlaylistLength()} songs)
              <Button
                onClick={onPlaylistShuffle}
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                size="sm"
              >
                <Shuffle className="w-4 h-4" />
                Shuffle Default Playlist
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96 border rounded-md p-4 bg-white">
            {/* Now Playing Section */}
            {currentlyPlaying && currentlyPlaying !== "Loading..." && (
              <div className="mb-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 border-green-200 border rounded-md">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <Play className="w-2 h-2 text-white" />
                  </div>
                  <span className="text-sm font-mono text-gray-500 w-8">
                    ��
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-green-700">
                      {cleanTitle(currentlyPlaying)} (Now Playing)
                    </div>
                    <div className="text-xs text-green-600">
                      Currently Playing
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Priority Queue Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-blue-700">
                  Priority Queue (Requests):{" "}
                  {priorityQueue.length > 0
                    ? `${priorityQueue.length} songs`
                    : "Empty"}
                </h3>
              </div>
              {priorityQueue.length > 0 ? (
                <div className="space-y-1">
                  {priorityQueue.map((request, index) => (
                    <div
                      key={`priority-${request.id}-${index}`}
                      className="flex items-center gap-3 p-3 bg-blue-50 border-blue-200 border rounded-md"
                    >
                      <span className="text-sm font-mono text-blue-600 w-8">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-blue-700">
                          {cleanTitle(request.title)}
                        </div>
                        <div className="text-xs text-blue-600">
                          {request.channelTitle}
                        </div>
                      </div>
                      <div className="text-xs text-blue-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(request.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No user requests pending
                </div>
              )}
            </div>

            {/* Default Playlist Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <List className="w-4 h-4 text-gray-600" />
                <h3 className="font-semibold text-gray-700">
                  Default Playlist:{" "}
                  {
                    currentPlaylistVideos.filter(
                      (v) => !v.isUserRequest && !v.isNowPlaying,
                    ).length
                  }{" "}
                  songs
                </h3>
              </div>
              {currentPlaylistVideos
                .filter((video) => !video.isUserRequest && !video.isNowPlaying)
                .map((video, index) => (
                  <div
                    key={`default-${video.id}-${index}`}
                    className="flex items-center gap-3 p-3 border-b hover:bg-gray-50"
                  >
                    <span className="text-sm font-mono text-gray-500 w-8">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">
                        {cleanTitle(video.title)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {video.channelTitle}
                      </div>
                    </div>
                  </div>
                ))}
              {currentPlaylistVideos.filter(
                (v) => !v.isUserRequest && !v.isNowPlaying,
              ).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No songs in default playlist
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Display Controls Component
interface DisplayControlsProps {
  playerWindow: Window | null;
  onInitializePlayer: () => void;
}

const DisplayControls: React.FC<DisplayControlsProps> = ({
  playerWindow,
  onInitializePlayer,
}) => {
  const [availableDisplays, setAvailableDisplays] = useState<DisplayInfo[]>([]);
  const [selectedDisplay, setSelectedDisplay] = useState<string>("");
  const [useFullscreen, setUseFullscreen] = useState(true);
  const [autoDetect, setAutoDetect] = useState(true);

  useEffect(() => {
    const loadDisplays = async () => {
      const displays = await displayManager.getDisplays();
      setAvailableDisplays(displays);

      // Auto-select secondary display if available and auto-detect is enabled
      if (autoDetect) {
        const secondaryDisplay = displays.find((d) => !d.isPrimary);
        if (secondaryDisplay) {
          setSelectedDisplay(secondaryDisplay.id);
          setUseFullscreen(true);
        } else {
          const primaryDisplay =
            displays.find((d) => d.isPrimary) || displays[0];
          if (primaryDisplay) {
            setSelectedDisplay(primaryDisplay.id);
            setUseFullscreen(false);
          }
        }
      }
    };

    loadDisplays();
  }, [autoDetect]);

  const handleOpenPlayerOnDisplay = () => {
    const display = availableDisplays.find((d) => d.id === selectedDisplay);
    if (!display) return;

    console.log(
      `[DisplayControls] Opening player on ${display.name} (${useFullscreen ? "fullscreen" : "windowed"})`,
    );

    // Close existing player window if open
    if (playerWindow && !playerWindow.closed) {
      playerWindow.close();
    }

    // Open player on selected display
    const features = displayManager.generateWindowFeatures(
      display,
      useFullscreen,
    );
    const newPlayerWindow = window.open(
      "/player.html",
      "JukeboxPlayer",
      features,
    );

    if (newPlayerWindow && useFullscreen) {
      newPlayerWindow.addEventListener("load", () => {
        setTimeout(() => {
          try {
            newPlayerWindow.document.documentElement.requestFullscreen();
          } catch (error) {
            console.warn("Could not enter fullscreen mode:", error);
          }
        }, 1000);
      });
    }
  };

  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4 text-blue-600" />
        <label className="text-sm font-medium text-blue-800">
          Display Management
        </label>
      </div>

      <div className="space-y-3">
        {/* Auto-detect toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={autoDetect}
            onCheckedChange={setAutoDetect}
            id="auto-detect-display"
          />
          <label
            htmlFor="auto-detect-display"
            className="text-sm text-blue-700"
          >
            Auto-select secondary display (recommended)
          </label>
        </div>

        {/* Display selection */}
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">
            Target Display:
          </label>
          <Select value={selectedDisplay} onValueChange={setSelectedDisplay}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select display..." />
            </SelectTrigger>
            <SelectContent>
              {availableDisplays.map((display) => (
                <SelectItem key={display.id} value={display.id}>
                  {display.name}{" "}
                  {display.isPrimary ? "(Primary)" : "(Secondary)"} -{" "}
                  {display.width}x{display.height}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fullscreen toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={useFullscreen}
            onCheckedChange={setUseFullscreen}
            id="use-fullscreen"
          />
          <label htmlFor="use-fullscreen" className="text-sm text-blue-700">
            Open in fullscreen mode
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleOpenPlayerOnDisplay}
            disabled={!selectedDisplay}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            size="sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open on Selected Display
          </Button>
          <Button
            onClick={() =>
              displayManager.getDisplays().then(setAvailableDisplays)
            }
            className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700"
            size="sm"
            variant="outline"
          >
            Refresh Displays
          </Button>
        </div>

        {/* Display info */}
        <div className="text-xs text-blue-600">
          {availableDisplays.length > 1
            ? `${availableDisplays.length} displays detected. Secondary display ${useFullscreen ? "fullscreen" : "windowed"} mode recommended.`
            : "Single display detected. Player will open in windowed mode."}
        </div>
      </div>
    </div>
  );
};

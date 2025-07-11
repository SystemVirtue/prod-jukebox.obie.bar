import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, X, ExternalLink, Info } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  officialScore?: number;
  duration?: string;
}

interface IframeSearchInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  showKeyboard: boolean;
  showSearchResults: boolean;
  onKeyboardInput: (key: string) => void;
  onVideoSelect: (video: SearchResult) => void;
  onBackToSearch: () => void;
  mode: "FREEPLAY" | "PAID";
  credits: number;
  onInsufficientCredits: () => void;
}

export const IframeSearchInterface: React.FC<IframeSearchInterfaceProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isSearching,
  showKeyboard,
  showSearchResults,
  onKeyboardInput,
  onVideoSelect,
  onBackToSearch,
  mode,
  credits,
  onInsufficientCredits,
}) => {
  const [videoIdInput, setVideoIdInput] = useState("");
  const [videoTitleInput, setVideoTitleInput] = useState("");

  const keyboardRows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];

  const handleKeyPress = (key: string) => {
    onKeyboardInput(key);
  };

  const handleVideoSelect = () => {
    if (mode === "PAID" && credits === 0) {
      onInsufficientCredits();
      return;
    }

    if (!videoIdInput.trim() || !videoTitleInput.trim()) {
      return;
    }

    // Extract video ID from YouTube URL if needed
    let videoId = videoIdInput.trim();
    const urlMatch = videoId.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    if (urlMatch) {
      videoId = urlMatch[1];
    }

    // Create a SearchResult object compatible with the existing system
    const video: SearchResult = {
      id: videoId,
      title: videoTitleInput.trim(),
      channelTitle: "YouTube User", // Default since we can't extract this from iframe
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      duration: "Unknown", // We can't get duration without API
    };

    onVideoSelect(video);

    // Clear inputs after selection
    setVideoIdInput("");
    setVideoTitleInput("");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900/20 backdrop-blur-sm border-slate-600 max-w-[95vw] w-full sm:w-[1400px] h-[calc(100vh-50px)] sm:h-[calc(100vh-100px)] top-[25px] sm:top-[50px] translate-y-0 p-0">
        {/* Close button */}
        <Button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 w-8 h-8 sm:w-12 sm:h-12 bg-red-600/80 hover:bg-red-700/80 border-2 border-red-500 shadow-lg"
          style={{ filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))" }}
        >
          <X className="w-4 h-4 sm:w-6 sm:h-6" />
        </Button>

        {showKeyboard && (
          <div className="h-full bg-slate-900/20 backdrop-blur-sm text-white p-3 sm:p-6 flex flex-col">
            <DialogHeader className="mb-3 sm:mb-6">
              <DialogTitle className="text-xl sm:text-3xl text-center text-amber-200">
                Search for Music - Iframe Mode
              </DialogTitle>
              <DialogDescription className="text-center text-amber-300 text-sm sm:text-base">
                Use the keyboard below to search for songs. Results will appear
                in YouTube's embedded search.
              </DialogDescription>
            </DialogHeader>

            <div className="mb-4 sm:mb-8">
              <Input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Enter song or artist..."
                className="w-full h-12 sm:h-16 text-lg sm:text-2xl bg-slate-800/60 backdrop-blur border-slate-600 text-white placeholder-slate-400"
                readOnly
              />
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              {keyboardRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-2">
                  {row.map((key) => (
                    <Button
                      key={key}
                      onClick={() => handleKeyPress(key)}
                      className="w-8 h-8 sm:w-20 sm:h-16 text-sm sm:text-xl font-bold bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border-2 border-slate-500 shadow-lg transform hover:scale-95 active:scale-90 transition-all duration-100"
                      style={{
                        filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))",
                      }}
                    >
                      {key}
                    </Button>
                  ))}
                </div>
              ))}

              <div className="flex justify-center gap-1 sm:gap-2 mt-2 sm:mt-4">
                <Button
                  onClick={() => handleKeyPress("SPACE")}
                  className="w-20 h-8 sm:w-40 sm:h-16 text-sm sm:text-xl font-bold bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border-2 border-slate-500 shadow-lg transform hover:scale-95 active:scale-90 transition-all duration-100"
                  style={{
                    filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))",
                  }}
                >
                  SPACE
                </Button>
                <Button
                  onClick={() => handleKeyPress("BACKSPACE")}
                  className="w-16 h-8 sm:w-32 sm:h-16 text-sm sm:text-xl font-bold bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border-2 border-red-500 shadow-lg transform hover:scale-95 active:scale-90 transition-all duration-100"
                  style={{
                    filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))",
                  }}
                >
                  ⌫
                </Button>
                <Button
                  onClick={() => handleKeyPress("SEARCH")}
                  disabled={!searchQuery.trim()}
                  className="w-16 h-8 sm:w-32 sm:h-16 text-sm sm:text-xl font-bold bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border-2 border-green-500 shadow-lg transform hover:scale-95 active:scale-90 transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))",
                  }}
                >
                  SEARCH
                </Button>
              </div>
            </div>
          </div>
        )}

        {showSearchResults && (
          <div className="h-full bg-slate-900/20 backdrop-blur-sm text-white flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/60 backdrop-blur">
              <Button
                onClick={onBackToSearch}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 text-lg"
                style={{
                  filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))",
                }}
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Search
              </Button>

              <div className="flex items-center gap-2 text-amber-200">
                <Info className="w-5 h-5" />
                <span className="text-sm">No API quota used!</span>
              </div>
            </div>

            <div className="flex-1 flex">
              {/* YouTube Search Iframe */}
              <div className="flex-1 p-4">
                <div className="bg-black rounded-lg overflow-hidden h-full">
                  <iframe
                    src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(searchQuery)}`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>

              {/* Search Results Panel */}
              <div className="w-80 p-4 border-l border-slate-700 bg-slate-800/40 backdrop-blur">
                <h3 className="text-xl font-bold text-amber-200 mb-4">
                  Search Results
                </h3>

                {isSearching ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-amber-200">Searching...</div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.slice(0, 10).map((video) => (
                        <div
                          key={video.id}
                          onClick={() => {
                            if (mode === "PAID" && credits === 0) {
                              onInsufficientCredits();
                              return;
                            }
                            onVideoSelect(video);
                          }}
                          className="bg-slate-700/60 rounded-lg p-3 cursor-pointer hover:bg-slate-600/60 transition-colors border border-slate-600 hover:border-amber-500"
                        >
                          <div className="flex gap-3">
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-16 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white text-sm font-medium line-clamp-2 mb-1">
                                {video.title}
                              </h4>
                              <p className="text-slate-400 text-xs">
                                {video.channelTitle}
                              </p>
                              {video.duration && (
                                <p className="text-slate-300 text-xs mt-1">
                                  {video.duration}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-slate-400 mb-4">
                          No search results found
                        </div>
                        <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-600">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-300 font-semibold">
                              Manual Add:
                            </span>
                          </div>
                          <div className="space-y-2">
                            <Input
                              value={videoIdInput}
                              onChange={(e) => setVideoIdInput(e.target.value)}
                              placeholder="YouTube URL or Video ID"
                              className="w-full bg-slate-700/60 border-slate-600 text-white placeholder-slate-400 text-xs"
                            />
                            <Input
                              value={videoTitleInput}
                              onChange={(e) =>
                                setVideoTitleInput(e.target.value)
                              }
                              placeholder="Song title"
                              className="w-full bg-slate-700/60 border-slate-600 text-white placeholder-slate-400 text-xs"
                            />
                            <Button
                              onClick={handleVideoSelect}
                              disabled={
                                !videoIdInput.trim() ||
                                !videoTitleInput.trim() ||
                                (mode === "PAID" && credits === 0)
                              }
                              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 text-sm disabled:opacity-50"
                            >
                              Add to Playlist
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {mode === "PAID" && (
                      <div className="bg-amber-900/40 p-3 rounded border border-amber-600 mt-4">
                        <p className="text-amber-200 text-sm">
                          Cost: 1 Credit (You have {credits} credits)
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={() =>
                        window.open(
                          `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
                          "_blank",
                        )
                      }
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 flex items-center justify-center gap-2 mt-4"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in New Tab
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

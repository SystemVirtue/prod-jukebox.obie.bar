
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, X } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  officialScore?: number;
  duration?: string;
}

interface SearchInterfaceProps {
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
  mode: 'FREEPLAY' | 'PAID';
  credits: number;
  onInsufficientCredits: () => void;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
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
  onInsufficientCredits
}) => {
  const keyboardRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const handleKeyPress = (key: string) => {
    onKeyboardInput(key);
  };

  const handleVideoSelect = (video: SearchResult) => {
    if (mode === 'PAID' && credits === 0) {
      onInsufficientCredits();
      return;
    }
    onVideoSelect(video);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900/20 backdrop-blur-sm border-slate-600 max-w-[95vw] w-[1200px] h-[calc(100vh-200px)] top-[100px] translate-y-0 p-0">
        {/* Close button */}
        <Button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-12 h-12 bg-red-600/80 hover:bg-red-700/80 border-2 border-red-500 shadow-lg"
          style={{ filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))' }}
        >
          <X className="w-6 h-6" />
        </Button>

        {showKeyboard && (
          <div className="h-full bg-slate-900/20 backdrop-blur-sm text-white p-6 flex flex-col">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl text-center text-amber-200">Search for Music</DialogTitle>
            </DialogHeader>
            
            <div className="mb-8">
              <Input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Enter song or artist..."
                className="w-full h-16 text-2xl bg-slate-800/60 backdrop-blur border-slate-600 text-white placeholder-slate-400"
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
                      className="w-20 h-16 text-xl font-bold bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border-2 border-slate-500 shadow-lg transform hover:scale-95 active:scale-90 transition-all duration-100"
                      style={{ filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))' }}
                    >
                      {key}
                    </Button>
                  ))}
                </div>
              ))}
              
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  onClick={() => handleKeyPress('SPACE')}
                  className="w-40 h-16 text-xl font-bold bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border-2 border-slate-500 shadow-lg transform hover:scale-95 active:scale-90 transition-all duration-100"
                  style={{ filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))' }}
                >
                  SPACE
                </Button>
                <Button
                  onClick={() => handleKeyPress('BACKSPACE')}
                  className="w-32 h-16 text-xl font-bold bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border-2 border-red-500 shadow-lg transform hover:scale-95 active:scale-90 transition-all duration-100"
                  style={{ filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))' }}
                >
                  ⌫
                </Button>
                <Button
                  onClick={() => handleKeyPress('SEARCH')}
                  disabled={!searchQuery.trim()}
                  className="w-32 h-16 text-xl font-bold bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border-2 border-green-500 shadow-lg transform hover:scale-95 active:scale-90 transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))' }}
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
                style={{ filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))' }}
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Search
              </Button>
              <h2 className="text-xl text-amber-200">Search Results</h2>
            </div>

            {isSearching ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-2xl text-amber-200">Searching...</div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div 
                  className="flex-1 overflow-y-auto p-6 search-results-scrollable"
                  style={{
                    scrollbarWidth: 'auto',
                    scrollbarColor: '#f59e0b #374151'
                  }}
                >
                  <style>{`
                    .search-results-scrollable::-webkit-scrollbar {
                      width: 20px;
                      display: block;
                    }
                    
                    .search-results-scrollable::-webkit-scrollbar-track {
                      background: #374151;
                      border-radius: 10px;
                    }
                    
                    .search-results-scrollable::-webkit-scrollbar-thumb {
                      background: #f59e0b;
                      border-radius: 10px;
                      border: 2px solid #374151;
                    }
                    
                    .search-results-scrollable::-webkit-scrollbar-thumb:hover {
                      background: #d97706;
                    }
                  `}</style>
                  <div className="grid grid-cols-4 gap-6">
                    {searchResults.map((video) => (
                      <div
                        key={video.id}
                        onClick={() => handleVideoSelect(video)}
                        className="bg-slate-800/80 backdrop-blur rounded-lg overflow-hidden cursor-pointer hover:bg-slate-700/80 transition-colors border border-slate-600 hover:border-amber-500 transform hover:scale-105 transition-all duration-200"
                        style={{ filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.6))' }}
                      >
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title}
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-3">
                          <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">{video.title}</h3>
                          <p className="text-slate-400 text-xs">{video.channelTitle}</p>
                          {video.duration && (
                            <p className="text-slate-300 text-xs mt-1">{video.duration}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

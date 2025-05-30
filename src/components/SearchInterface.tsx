
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  officialScore?: number;
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
  onBackToSearch
}) => {
  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const handleKeyPress = (key: string) => {
    onKeyboardInput(key);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-600 max-w-[95vw] w-[1200px] max-h-[95vh] h-[900px] p-0">
        {showKeyboard && (
          <div className="h-full bg-slate-900 text-white p-6 flex flex-col">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl text-center text-amber-200">Search for Music</DialogTitle>
            </DialogHeader>
            
            <div className="mb-8">
              <Input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Enter song or artist..."
                className="w-full h-16 text-2xl bg-slate-800 border-slate-600 text-white placeholder-slate-400"
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
                >
                  SPACE
                </Button>
                <Button
                  onClick={() => handleKeyPress('BACKSPACE')}
                  className="w-32 h-16 text-xl font-bold bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border-2 border-red-500 shadow-lg transform hover:scale-95 active:scale-90 transition-all duration-100"
                >
                  ⌫
                </Button>
                <Button
                  onClick={() => handleKeyPress('SEARCH')}
                  disabled={!searchQuery.trim()}
                  className="w-32 h-16 text-xl font-bold bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border-2 border-green-500 shadow-lg transform hover:scale-95 active:scale-90 transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SEARCH
                </Button>
              </div>
            </div>
          </div>
        )}

        {showSearchResults && (
          <div className="h-full bg-slate-900 text-white flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
              <Button
                onClick={onBackToSearch}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 text-lg"
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
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full [&>div>div[style]]:!pr-[50px]">
                  <div className="p-6 grid grid-cols-4 gap-6">
                    {searchResults.map((video) => (
                      <div
                        key={video.id}
                        onClick={() => onVideoSelect(video)}
                        className="bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:bg-slate-700 transition-colors border border-slate-600 hover:border-amber-500 transform hover:scale-105 transition-all duration-200"
                      >
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title}
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-3">
                          <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">{video.title}</h3>
                          <p className="text-slate-400 text-xs">{video.channelTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};


import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ['SPACE', 'BACKSPACE', 'SEARCH']
];

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
  isOpen,
  onClose,
  searchQuery,
  searchResults,
  isSearching,
  showKeyboard,
  showSearchResults,
  onKeyboardInput,
  onVideoSelect,
  onBackToSearch
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen bg-gray-900 border-gray-700 p-0">
        {showKeyboard && (
          <div className="flex flex-col h-full bg-gray-900">
            <div className="p-6">
              <h2 className="text-3xl font-bold text-white mb-6">Search for Music</h2>
              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <Input
                  value={searchQuery}
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
                    onClick={() => onKeyboardInput(key)}
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
                    onClick={() => onKeyboardInput(key)}
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
                    onClick={() => onKeyboardInput(key)}
                    className="h-16 text-xl font-bold bg-gray-700 hover:bg-gray-600 text-white border-2 border-gray-500 shadow-lg transform active:scale-95 transition-all"
                  >
                    {key}
                  </Button>
                ))}
              </div>
              
              <div className="flex justify-center gap-6">
                <Button
                  onClick={() => onKeyboardInput('SPACE')}
                  className="h-16 px-24 text-xl font-bold bg-gray-700 hover:bg-gray-600 text-white border-2 border-gray-500 shadow-lg transform active:scale-95 transition-all"
                >
                  SPACE
                </Button>
                <Button
                  onClick={() => onKeyboardInput('BACKSPACE')}
                  className="h-16 px-12 text-xl font-bold bg-red-700 hover:bg-red-600 text-white border-2 border-red-500 shadow-lg transform active:scale-95 transition-all"
                >
                  ←
                </Button>
                <Button
                  onClick={() => onKeyboardInput('SEARCH')}
                  disabled={!searchQuery.trim() || isSearching}
                  className="h-16 px-12 text-xl font-bold bg-green-700 hover:bg-green-600 text-white border-2 border-green-500 shadow-lg transform active:scale-95 transition-all"
                >
                  {isSearching ? '...' : 'SEARCH'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {showSearchResults && (
          <div className="flex flex-col h-full bg-gray-900">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
              <Button
                onClick={onBackToSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Search
              </Button>
              <h2 className="text-2xl font-bold text-white">Search Results</h2>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-6 grid grid-cols-4 gap-6">
                {searchResults.map((video) => (
                  <Card 
                    key={video.id} 
                    className="cursor-pointer hover:bg-gray-700 transition-colors bg-gray-800 border-gray-600"
                    onClick={() => onVideoSelect(video)}
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
  );
};

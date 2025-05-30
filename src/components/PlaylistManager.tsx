
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, GripVertical, Play, Shuffle } from 'lucide-react';

interface PlaylistItem {
  id: string;
  title: string;
  channelTitle: string;
  videoId: string;
  isNowPlaying?: boolean;
  isUserRequest?: boolean;
}

interface PlaylistManagerProps {
  currentPlaylistVideos: PlaylistItem[];
  onPlaylistReorder: (newPlaylist: PlaylistItem[]) => void;
  onPlaylistShuffle: () => void;
  onRemoveFromPlaylist: (index: number) => void;
  currentlyPlaying: string;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({
  currentPlaylistVideos,
  onPlaylistReorder,
  onPlaylistShuffle,
  onRemoveFromPlaylist,
  currentlyPlaying
}) => {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Don't allow dragging the "Now Playing" item
    if (currentPlaylistVideos[index]?.isNowPlaying) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    // Don't allow dropping on the "Now Playing" item
    if (currentPlaylistVideos[index]?.isNowPlaying) {
      return;
    }
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Don't allow dropping on the "Now Playing" item
    if (currentPlaylistVideos[dropIndex]?.isNowPlaying) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPlaylist = [...currentPlaylistVideos];
    const draggedItem = newPlaylist[draggedIndex];
    
    // Remove the dragged item
    newPlaylist.splice(draggedIndex, 1);
    
    // Adjust drop index if necessary
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    
    // Insert at new position
    newPlaylist.splice(adjustedDropIndex, 0, draggedItem);
    
    onPlaylistReorder(newPlaylist);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleRemove = (index: number) => {
    // Don't allow removing the "Now Playing" item
    if (currentPlaylistVideos[index]?.isNowPlaying) {
      return;
    }
    onRemoveFromPlaylist(index);
  };

  // Filter out the "Now Playing" item for display purposes - it's handled separately
  const queueItems = currentPlaylistVideos.filter(item => !item.isNowPlaying);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Current Playlist Queue</CardTitle>
        <Button
          onClick={onPlaylistShuffle}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Shuffle className="w-4 h-4" />
          Shuffle
        </Button>
      </CardHeader>
      <CardContent>
        {currentlyPlaying && currentlyPlaying !== 'Loading...' && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-800">Now Playing:</span>
              <span className="text-green-700">{currentlyPlaying}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-semibold text-amber-800">Priority Queue (User Requests):</h4>
          {queueItems.filter(item => item.isUserRequest).length === 0 ? (
            <p className="text-amber-600 italic">No pending requests</p>
          ) : (
            <div className="space-y-1">
              {queueItems.filter(item => item.isUserRequest).map((item, originalIndex) => {
                const actualIndex = currentPlaylistVideos.findIndex(v => v.id === item.id);
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, actualIndex)}
                    onDragOver={(e) => handleDragOver(e, actualIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, actualIndex)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-2 border rounded cursor-move bg-amber-50 ${
                      dragOverIndex === actualIndex ? 'border-blue-400 bg-blue-50' : 'border-amber-200'
                    } ${draggedIndex === actualIndex ? 'opacity-50' : ''}`}
                  >
                    <GripVertical className="w-4 h-4 text-amber-400" />
                    <span className="flex-1 text-amber-800">🎵 {item.title}</span>
                    <Button
                      onClick={() => handleRemove(actualIndex)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <h4 className="font-semibold text-amber-800 mt-4">Default Playlist (Next {Math.min(10, queueItems.filter(item => !item.isUserRequest).length)} songs):</h4>
          <div className="space-y-1">
            {queueItems.filter(item => !item.isUserRequest).slice(0, 10).map((item, originalIndex) => {
              const actualIndex = currentPlaylistVideos.findIndex(v => v.id === item.id);
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, actualIndex)}
                  onDragOver={(e) => handleDragOver(e, actualIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, actualIndex)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 p-2 border rounded cursor-move ${
                    dragOverIndex === actualIndex ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                  } ${draggedIndex === actualIndex ? 'opacity-50' : ''}`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="flex-1">{originalIndex + 1}. {item.title}</span>
                  <Button
                    onClick={() => handleRemove(actualIndex)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

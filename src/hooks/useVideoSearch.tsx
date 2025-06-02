
import { useState } from 'react';
import { JukeboxState, SearchResult, QueuedRequest, LogEntry } from "./useJukeboxState";

export const useVideoSearch = (
  state: JukeboxState,
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>,
  addLog: (type: LogEntry['type'], description: string, videoId?: string, creditAmount?: number) => void,
  addUserRequest: (title: string, videoId: string, channelTitle: string) => void,
  addCreditHistory: (amount: number, type: 'ADDED' | 'REMOVED', description: string) => void,
  toast: any
) => {
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    video: SearchResult | null;
  }>({ isOpen: false, video: null });

  // Helper function to convert duration string to minutes
  const durationToMinutes = (duration: string): number => {
    // Parse ISO 8601 duration format (PT4M33S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 60 + minutes + (seconds > 30 ? 1 : 0); // Round up if over 30 seconds
  };

  // Helper function to format duration for display
  const formatDuration = (duration: string): string => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    console.log('performSearch called with query:', query);
    
    if (query.toUpperCase() === 'ADMIN') {
      setState(prev => ({ 
        ...prev, 
        isAdminOpen: true, 
        searchQuery: '', 
        showKeyboard: false,
        showSearchResults: false,
        isSearchOpen: false 
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isSearching: true, 
      searchResults: [], 
      showKeyboard: false, 
      showSearchResults: true 
    }));

    try {
      console.log('Starting YouTube search for:', query);
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=50&key=${state.apiKey}`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('YouTube API response:', data);
      
      if (data.items && data.items.length > 0) {
        // Get video durations
        const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${state.apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        // Create duration map
        const durationMap = new Map();
        detailsData.items?.forEach((item: any) => {
          durationMap.set(item.id, item.contentDetails.duration);
        });
        
        const filteredResults = filterForOfficial(data.items, query);
        const searchResults: SearchResult[] = filteredResults
          .map(video => {
            const duration = durationMap.get(video.id.videoId) || '';
            const durationMinutes = durationToMinutes(duration);
            return {
              id: video.id.videoId,
              title: video.snippet.title.replace(/\([^)]*\)/g, '').trim(),
              channelTitle: video.snippet.channelTitle,
              thumbnailUrl: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
              videoUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
              officialScore: video.officialScore,
              duration: formatDuration(duration),
              durationMinutes
            };
          })
          .filter(video => video.durationMinutes <= state.maxSongLength)
          
        
        console.log('Filtered search results:', searchResults);
        setState(prev => ({ ...prev, searchResults }));
      } else {
        console.log('No search results found');
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
    console.log('Video selected:', video);
    
    // Check for duplicate in priority queue
    const isDuplicate = state.priorityQueue.some(req => req.videoId === video.id);
    
    if (isDuplicate) {
      setState(prev => ({ 
        ...prev, 
        showDuplicateSong: true, 
        duplicateSongTitle: video.title 
      }));
      return;
    }
    
    setConfirmDialog({ isOpen: true, video });
  };

  const confirmAddToPlaylist = () => {
    if (!confirmDialog.video) return;

    console.log('Adding video to priority queue:', confirmDialog.video);

    if (state.mode === 'PAID' && state.credits === 0) {
      setState(prev => ({ ...prev, showInsufficientCredits: true }));
      setConfirmDialog({ isOpen: false, video: null });
      return;
    }

    // Add to priority queue
    const newRequest: QueuedRequest = {
      id: confirmDialog.video.id,
      title: confirmDialog.video.title,
      channelTitle: confirmDialog.video.channelTitle,
      videoId: confirmDialog.video.id,
      timestamp: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      priorityQueue: [...prev.priorityQueue, newRequest],
      credits: prev.mode === 'PAID' ? Math.max(0, prev.credits - 1) : prev.credits
    }));

    addLog('USER_SELECTION', `Selected: ${confirmDialog.video.title}`, confirmDialog.video.id);
    addUserRequest(confirmDialog.video.title, confirmDialog.video.id, confirmDialog.video.channelTitle);
    if (state.mode === 'PAID') {
      addLog('CREDIT_REMOVED', 'Song request cost', undefined, -1);
      addCreditHistory(1, 'REMOVED', 'Song request cost');
    }

    toast({
      title: "Song Added",
      description: `"${confirmDialog.video.title}" added to priority queue`,
    });

    setConfirmDialog({ isOpen: false, video: null });
    setState(prev => ({ 
      ...prev, 
      isSearchOpen: false, 
      showKeyboard: false, 
      showSearchResults: false,
      searchQuery: '',
      searchResults: []
    }));
  };

  const handleKeyboardInput = (key: string) => {
    console.log('Keyboard input:', key);
    
    setState(prev => {
      let newQuery = prev.searchQuery;
      
      switch (key) {
        case 'BACKSPACE':
          newQuery = newQuery.slice(0, -1);
          console.log('New query after backspace:', newQuery);
          return { ...prev, searchQuery: newQuery };
        case 'SPACE':
          newQuery += ' ';
          console.log('New query after space:', newQuery);
          return { ...prev, searchQuery: newQuery };
        case 'SEARCH':
          console.log('Search button pressed, query:', newQuery);
          if (newQuery.trim()) {
            // Perform search asynchronously
            setTimeout(() => performSearch(newQuery), 0);
          }
          return prev; // Don't update query here, let performSearch handle state
        default:
          newQuery += key;
          console.log('New query after key press:', newQuery);
          return { ...prev, searchQuery: newQuery };
      }
    });
  };

  return {
    performSearch,
    filterForOfficial,
    handleVideoSelect,
    confirmAddToPlaylist,
    handleKeyboardInput,
    confirmDialog,
    setConfirmDialog
  };
};

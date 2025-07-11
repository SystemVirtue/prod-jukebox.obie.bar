import { useState } from "react";
import {
  JukeboxState,
  SearchResult,
  QueuedRequest,
  LogEntry,
} from "./useJukeboxState";
import { musicSearchService } from "@/services/musicSearch";

export const useVideoSearch = (
  state: JukeboxState,
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>,
  addLog: (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number,
  ) => void,
  addUserRequest: (
    title: string,
    videoId: string,
    channelTitle: string,
  ) => void,
  addCreditHistory: (
    amount: number,
    type: "ADDED" | "REMOVED",
    description: string,
  ) => void,
  toast: any,
  checkAndRotateIfNeeded?: () => Promise<void>,
) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    video: SearchResult | null;
  }>({ isOpen: false, video: null });

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    console.log("performSearch called with query:", query);

    if (query.toUpperCase() === "ADMIN") {
      setState((prev) => ({
        ...prev,
        isAdminOpen: true,
        searchQuery: "",
        showKeyboard: false,
        showSearchResults: false,
        isSearchOpen: false,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isSearching: true,
      searchResults: [],
      showKeyboard: false,
      showSearchResults: true,
    }));

    try {
      // Check for rotation before making API calls
      if (checkAndRotateIfNeeded) {
        await checkAndRotateIfNeeded();
      }

      console.log(`Starting search with ${state.searchMethod} for:`, query);

      const searchResults = await musicSearchService.search(
        query,
        state.searchMethod,
        state.apiKey,
        48,
      );

      const filteredResults = searchResults.filter(
        (video) => video.durationMinutes! <= state.maxSongLength,
      );

      console.log(
        `Search completed with ${state.searchMethod}:`,
        filteredResults,
      );
      setState((prev) => ({ ...prev, searchResults: filteredResults }));

      if (filteredResults.length === 0) {
        toast({
          title: "No Results",
          description: "No music videos found for your search.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Search error:", error);

      // If ytmusic-api fails, try fallback to YouTube API
      if (state.searchMethod === "ytmusic_api") {
        console.log("YtMusic search failed, falling back to YouTube API...");
        try {
          const fallbackResults = await musicSearchService.search(
            query,
            "youtube_api",
            state.apiKey,
            48,
          );

          const filteredFallbackResults = fallbackResults.filter(
            (video) => video.durationMinutes! <= state.maxSongLength,
          );

          setState((prev) => ({
            ...prev,
            searchResults: filteredFallbackResults,
          }));

          toast({
            title: "Search Completed",
            description: "Used YouTube API as fallback search method.",
            variant: "default",
          });
        } catch (fallbackError) {
          console.error("Fallback search also failed:", fallbackError);
          toast({
            title: "Search Error",
            description: "Both search methods failed. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Search Error",
          description: "Failed to search for music videos.",
          variant: "destructive",
        });
      }
    } finally {
      setState((prev) => ({ ...prev, isSearching: false }));
    }
  };

  const handleVideoSelect = (video: SearchResult) => {
    console.log("Video selected:", video);

    // Check for duplicate in priority queue
    const isDuplicate = state.priorityQueue.some(
      (req) => req.videoId === video.id,
    );

    if (isDuplicate) {
      setState((prev) => ({
        ...prev,
        showDuplicateSong: true,
        duplicateSongTitle: video.title,
      }));
      return;
    }

    setConfirmDialog({ isOpen: true, video });
  };

  const confirmAddToPlaylist = () => {
    if (!confirmDialog.video) return;

    console.log("Adding video to priority queue:", confirmDialog.video);

    if (state.mode === "PAID" && state.credits === 0) {
      setState((prev) => ({ ...prev, showInsufficientCredits: true }));
      setConfirmDialog({ isOpen: false, video: null });
      return;
    }

    // Add to priority queue
    const newRequest: QueuedRequest = {
      id: confirmDialog.video.id,
      title: confirmDialog.video.title,
      channelTitle: confirmDialog.video.channelTitle,
      videoId: confirmDialog.video.id,
      timestamp: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      priorityQueue: [...prev.priorityQueue, newRequest],
      credits:
        prev.mode === "PAID" ? Math.max(0, prev.credits - 1) : prev.credits,
    }));

    addLog(
      "USER_SELECTION",
      `Selected: ${confirmDialog.video.title}`,
      confirmDialog.video.id,
    );
    addUserRequest(
      confirmDialog.video.title,
      confirmDialog.video.id,
      confirmDialog.video.channelTitle,
    );
    if (state.mode === "PAID") {
      addLog("CREDIT_REMOVED", "Song request cost", undefined, -1);
      addCreditHistory(1, "REMOVED", "Song request cost");
    }

    toast({
      title: "Song Added",
      description: `"${confirmDialog.video.title}" added to priority queue`,
    });

    setConfirmDialog({ isOpen: false, video: null });
    setState((prev) => ({
      ...prev,
      isSearchOpen: false,
      showKeyboard: false,
      showSearchResults: false,
      searchQuery: "",
      searchResults: [],
    }));
  };

  const handleKeyboardInput = (key: string) => {
    console.log("Keyboard input:", key);

    setState((prev) => {
      let newQuery = prev.searchQuery;

      switch (key) {
        case "BACKSPACE":
          newQuery = newQuery.slice(0, -1);
          console.log("New query after backspace:", newQuery);
          return { ...prev, searchQuery: newQuery };
        case "SPACE":
          newQuery += " ";
          console.log("New query after space:", newQuery);
          return { ...prev, searchQuery: newQuery };
        case "SEARCH":
          console.log("Search button pressed, query:", newQuery);
          if (newQuery.trim()) {
            // Perform search asynchronously
            setTimeout(() => performSearch(newQuery), 0);
          }
          return prev; // Don't update query here, let performSearch handle state
        default:
          newQuery += key;
          console.log("New query after key press:", newQuery);
          return { ...prev, searchQuery: newQuery };
      }
    });
  };

  return {
    performSearch,
    handleVideoSelect,
    confirmAddToPlaylist,
    handleKeyboardInput,
    confirmDialog,
    setConfirmDialog,
  };
};

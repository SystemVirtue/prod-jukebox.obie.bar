import { JukeboxState, PlaylistItem, LogEntry } from "./useJukeboxState";
import { youtubeQuotaService } from "@/services/youtubeQuota";

export const usePlaylistManager = (
  state: JukeboxState,
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>,
  addLog: (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number,
  ) => void,
  playSong: (
    videoId: string,
    title: string,
    artist: string,
    logType: "SONG_PLAYED" | "USER_SELECTION",
  ) => void,
  toast: any,
) => {
  const loadPlaylistVideos = async (playlistId: string) => {
    console.log("Loading playlist videos for:", playlistId);

    if (!state.apiKey) {
      console.error("No API key available");
      toast({
        title: "Configuration Error",
        description:
          "No YouTube API key configured. Please check admin settings.",
        variant: "destructive",
      });
      return;
    }

    // Validate API key format
    if (!state.apiKey.startsWith("AIza") || state.apiKey.length < 20) {
      console.error("Invalid API key format");
      toast({
        title: "Configuration Error",
        description:
          "Invalid YouTube API key format. Please check admin settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      let allVideos: PlaylistItem[] = [];
      let nextPageToken = "";
      let retryCount = 0;
      const maxRetries = 2;

      // Load ALL videos without any limits
      do {
        // Validate parameters before constructing URL
        if (!playlistId || typeof playlistId !== "string") {
          throw new Error("Invalid playlist ID provided");
        }
        if (!state.apiKey || typeof state.apiKey !== "string") {
          throw new Error("Invalid API key provided");
        }

        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&maxResults=50&key=${encodeURIComponent(state.apiKey)}${nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : ""}`;

        console.log(`[LoadPlaylist] Fetching: ${url}`);

        // Simple fetch approach to avoid body stream issues
        let data;
        try {
          const response = await fetch(url);

          if (!response.ok) {
            if (response.status === 403) {
              console.log("Quota exceeded, using fallback playlist");
              allVideos = []; // Trigger fallback
              break;
            }
            console.error(`HTTP ${response.status} error`);
            allVideos = []; // Trigger fallback for any error
            break;
          }

          data = await response.json();

          // Track API usage
          youtubeQuotaService.trackApiUsage(state.apiKey, "playlistItems", 1);
        } catch (error) {
          console.error("Error fetching playlist:", error.message || error);
          // Any error triggers fallback
          allVideos = [];
          break;
        }

        if (responseStatus < 200 || responseStatus >= 300) {
          console.error(`API Error ${responseStatus}:`, responseText);

          if (responseStatus === 403) {
            // Check if it's quota exceeded or invalid key
            if (responseText.includes("quotaExceeded")) {
              console.log("Quota exceeded, proceeding to fallback playlist");
              toast({
                title: "Quota Exceeded",
                description:
                  "YouTube API quota exceeded. Using fallback playlist.",
                variant: "default",
              });
              // Set a flag to trigger fallback and break out of the loop
              allVideos = []; // Empty array will trigger fallback after the loop
              break; // Exit the retry loop
            } else {
              toast({
                title: "Invalid API Key",
                description:
                  "YouTube API key is invalid. Please check admin settings.",
                variant: "destructive",
              });
              throw new Error("YouTube API key is invalid or access denied.");
            }
          } else if (responseStatus === 404) {
            toast({
              title: "Playlist Not Found",
              description: `Playlist ${playlistId} not found or is private.`,
              variant: "destructive",
            });
            throw new Error(
              "Playlist not found. Please check the playlist ID.",
            );
          } else if (responseStatus === 400) {
            toast({
              title: "Bad Request",
              description:
                "Invalid playlist request. Please check the playlist configuration.",
              variant: "destructive",
            });
            throw new Error("Invalid playlist request parameters.");
          } else {
            toast({
              title: "API Error",
              description: `YouTube API returned error ${responseStatus}. Please try again.`,
              variant: "destructive",
            });
            throw new Error(
              `Failed to load playlist (HTTP ${responseStatus}): ${responseText}`,
            );
          }
        } else {
          // Parse successful response
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
            allVideos = []; // Trigger fallback
            break;
          }
        }

        // Skip processing if we don't have data (e.g., quota exceeded case)
        if (!data || !data.items) {
          console.log(
            "No data to process, continuing to next iteration or fallback",
          );
          break;
        }

        const videos: PlaylistItem[] = data.items
          .filter((item: any) => {
            // Filter out private/unavailable videos
            return (
              item.snippet.title !== "Private video" &&
              item.snippet.title !== "Deleted video" &&
              item.snippet.title !== "[Private video]" &&
              item.snippet.title !== "[Deleted video]" &&
              item.snippet.resourceId?.videoId
            );
          })
          .map((item: any) => ({
            id: item.id,
            title: item.snippet.title.replace(/\([^)]*\)/g, "").trim(),
            channelTitle: item.snippet.channelTitle,
            videoId: item.snippet.resourceId.videoId,
          }));

        allVideos = [...allVideos, ...videos];
        nextPageToken = data.nextPageToken || "";

        console.log(
          `[LoadPlaylist] Loaded ${videos.length} videos this batch, total so far: ${allVideos.length}`,
        );
      } while (nextPageToken);

      // Check if we got any videos, if not, proceed directly to fallback
      if (allVideos.length === 0) {
        console.log("No videos loaded, proceeding to fallback playlist");
        // Don't throw error, just create fallback playlist directly
        const fallbackVideos: PlaylistItem[] = [
          {
            id: "fallback-1",
            title: "Demo Song 1 (Offline Mode)",
            channelTitle: "System",
            videoId: "dQw4w9WgXcQ", // Rick Roll as fallback
            isNowPlaying: false,
            isUserRequest: false,
          },
          {
            id: "fallback-2",
            title: "Demo Song 2 (Offline Mode)",
            channelTitle: "System",
            videoId: "oHg5SJYRHA0", // Another classic
            isNowPlaying: false,
            isUserRequest: false,
          },
          {
            id: "fallback-3",
            title: "Demo Song 3 (Offline Mode)",
            channelTitle: "System",
            videoId: "kJQP7kiw5Fk", // Despacito
            isNowPlaying: false,
            isUserRequest: false,
          },
        ];

        setState((prev) => ({
          ...prev,
          defaultPlaylistVideos: fallbackVideos,
          inMemoryPlaylist: fallbackVideos,
          currentVideoIndex: 0,
        }));

        toast({
          title: "Quota Exceeded - Fallback Mode",
          description:
            "YouTube API quota exceeded. Using fallback playlist. Enable API key rotation in admin settings for better reliability.",
          variant: "default",
        });

        addLog(
          "SONG_PLAYED",
          "Loaded fallback playlist due to quota exhaustion",
        );

        return; // Exit the function successfully
      }

      // Shuffle playlist ONCE after loading
      const shuffled = shuffleArray(allVideos);
      setState((prev) => ({
        ...prev,
        defaultPlaylistVideos: allVideos, // keep original for reference
        inMemoryPlaylist: [...shuffled], // shuffle for playback
        currentVideoIndex: 0,
      }));

      console.log(
        `[LoadPlaylist] Loaded ALL ${allVideos.length} videos from playlist (shuffled order)`,
      );
    } catch (error) {
      console.error("Error loading playlist:", error);

      // Provide fallback content when API is unavailable
      if (
        error instanceof Error &&
        (error.message.includes("Network error") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("Quota exceeded") ||
          error.message.includes("No videos available"))
      ) {
        console.log(
          "API unavailable or quota exceeded, providing fallback playlist content",
        );

        // Create minimal fallback playlist with popular music videos
        const fallbackVideos: PlaylistItem[] = [
          {
            id: "fallback-1",
            title: "Demo Song 1 (Offline Mode)",
            channelTitle: "System",
            videoId: "dQw4w9WgXcQ", // Rick Roll as fallback
            isNowPlaying: false,
            isUserRequest: false,
          },
          {
            id: "fallback-2",
            title: "Demo Song 2 (Offline Mode)",
            channelTitle: "System",
            videoId: "oHg5SJYRHA0", // Another classic
            isNowPlaying: false,
            isUserRequest: false,
          },
          {
            id: "fallback-3",
            title: "Demo Song 3 (Offline Mode)",
            channelTitle: "System",
            videoId: "kJQP7kiw5Fk", // Despacito
            isNowPlaying: false,
            isUserRequest: false,
          },
        ];

        setState((prev) => ({
          ...prev,
          defaultPlaylistVideos: fallbackVideos,
          inMemoryPlaylist: fallbackVideos,
          currentVideoIndex: 0,
        }));

        const isQuotaIssue = error.message.includes("Quota exceeded");
        toast({
          title: isQuotaIssue
            ? "Quota Exceeded - Fallback Mode"
            : "Offline Mode",
          description: isQuotaIssue
            ? "YouTube API quota exceeded. Using fallback playlist. Enable API key rotation in admin settings for better reliability."
            : "Using fallback playlist due to YouTube API connectivity issues. Check your API key in admin settings.",
          variant: "default",
        });

        addLog(
          "SONG_PLAYED",
          isQuotaIssue
            ? "Loaded fallback playlist due to quota exhaustion"
            : "Loaded fallback playlist due to API unavailability",
        );
      } else {
        toast({
          title: "Playlist Error",
          description:
            "Failed to load default playlist. Check API key and playlist ID in admin settings.",
          variant: "destructive",
        });
      }
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const playNextSong = () => {
    console.log(
      "[PlayNext] playNextSong called - checking priority queue first...",
    );
    console.log(
      "[PlayNext] Priority queue length:",
      state.priorityQueue.length,
    );
    console.log(
      "[PlayNext] In-memory playlist length:",
      state.inMemoryPlaylist.length,
    );

    // Always check priority queue first
    if (state.priorityQueue.length > 0) {
      console.log("[PlayNext] Playing next song from priority queue");
      const nextRequest = state.priorityQueue[0];
      console.log(
        "[PlayNext] Next priority song:",
        nextRequest.title,
        "VideoID:",
        nextRequest.videoId,
      );

      setState((prev) => ({
        ...prev,
        priorityQueue: prev.priorityQueue.slice(1),
      }));

      playSong(
        nextRequest.videoId,
        nextRequest.title,
        nextRequest.channelTitle,
        "USER_SELECTION",
      );
      return;
    }

    // Play from in-memory playlist - SEQUENTIAL ORDER
    if (state.inMemoryPlaylist.length > 0) {
      console.log(
        "[PlayNext] Playing next song from in-memory playlist (sequential order)",
      );
      const nextVideo = state.inMemoryPlaylist[0];
      console.log(
        "[PlayNext] Next playlist song:",
        nextVideo.title,
        "VideoID:",
        nextVideo.videoId,
      );

      // Send song to player FIRST
      playSong(
        nextVideo.videoId,
        nextVideo.title,
        nextVideo.channelTitle,
        "SONG_PLAYED",
      );

      // THEN move played song to end of playlist (circular playlist) after a short delay
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          inMemoryPlaylist: [...prev.inMemoryPlaylist.slice(1), nextVideo],
        }));
      }, 100);
    } else {
      console.warn(
        "[PlayNext] No songs available in playlist or priority queue!",
      );
    }
  };

  const handleVideoEnded = () => {
    console.log("[VideoEnded] Video ended, triggering playNextSong...");
    playNextSong();
  };

  const handleDefaultPlaylistChange = (playlistId: string) => {
    setState((prev) => ({ ...prev, defaultPlaylist: playlistId }));
    loadPlaylistVideos(playlistId);
  };

  const handlePlaylistReorder = (newPlaylist: PlaylistItem[]) => {
    setState((prev) => ({ ...prev, inMemoryPlaylist: newPlaylist }));
  };

  const handlePlaylistShuffle = () => {
    console.log("[Shuffle] Manual shuffle requested by user");
    // Don't shuffle if currently playing - only shuffle the remaining playlist
    const currentSong = state.inMemoryPlaylist.find(
      (song) => song.title === state.currentlyPlaying,
    );
    const remainingPlaylist = state.inMemoryPlaylist.filter(
      (song) => song.title !== state.currentlyPlaying,
    );
    const shuffledRemaining = shuffleArray(remainingPlaylist);

    // If there's a current song, keep it at the front
    const newPlaylist = currentSong
      ? [currentSong, ...shuffledRemaining]
      : shuffledRemaining;

    setState((prev) => ({ ...prev, inMemoryPlaylist: newPlaylist }));
    addLog(
      "SONG_PLAYED",
      "Playlist shuffled by admin (excluding current song)",
    );
    toast({
      title: "Playlist Shuffled",
      description:
        "The playlist order has been randomized (current song unchanged)",
    });
  };

  return {
    loadPlaylistVideos,
    playNextSong,
    handleVideoEnded,
    handleDefaultPlaylistChange,
    handlePlaylistReorder,
    handlePlaylistShuffle,
  };
};

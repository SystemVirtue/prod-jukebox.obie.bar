import { JukeboxState, PlaylistItem, LogEntry } from "./useJukeboxState";

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
    try {
      let allVideos: PlaylistItem[] = [];
      let nextPageToken = "";

      // Load ALL videos without any limits
      do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${state.apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;

        let response;
        try {
          response = await fetch(url);
        } catch (networkError) {
          console.error("Network error loading playlist:", networkError);
          throw new Error(
            "Network error: Unable to connect to YouTube API. Please check your internet connection.",
          );
        }

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error(
              "YouTube API key is invalid or has exceeded quota limits.",
            );
          } else if (response.status === 404) {
            throw new Error(
              "Playlist not found. Please check the playlist ID.",
            );
          } else {
            throw new Error(
              `Failed to load playlist (HTTP ${response.status})`,
            );
          }
        }

        const data = await response.json();
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
      toast({
        title: "Playlist Error",
        description: "Failed to load default playlist",
        variant: "destructive",
      });
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

      // Move played song to end of playlist (circular playlist)
      setState((prev) => ({
        ...prev,
        inMemoryPlaylist: [...prev.inMemoryPlaylist.slice(1), nextVideo],
      }));

      playSong(
        nextVideo.videoId,
        nextVideo.title,
        nextVideo.channelTitle,
        "SONG_PLAYED",
      );
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

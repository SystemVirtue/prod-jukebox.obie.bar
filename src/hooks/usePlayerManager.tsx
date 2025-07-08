import { useToast } from "@/hooks/use-toast";
import { JukeboxState, LogEntry } from "./useJukeboxState";

export const usePlayerManager = (
  state: JukeboxState,
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>,
  addLog: (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number,
  ) => void,
) => {
  const { toast } = useToast();

  const initializePlayer = () => {
    if (state.playerWindow && !state.playerWindow.closed) {
      console.log("Player window already exists");
      return;
    }

    console.log("Attempting to open player window...");
    const playerWindow = window.open(
      "/player.html",
      "JukeboxPlayer",
      "width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no",
    );

    if (playerWindow) {
      setState((prev) => ({ ...prev, playerWindow, isPlayerRunning: true }));
      console.log("Player window opened successfully");

      // Start first song after a delay to allow player to initialize
      setTimeout(() => {
        if (state.inMemoryPlaylist.length > 0) {
          const firstSong = state.inMemoryPlaylist[0];
          console.log(
            "Auto-starting first song after player initialization:",
            firstSong.title,
          );
          playSong(
            firstSong.videoId,
            firstSong.title,
            firstSong.channelTitle,
            "SONG_PLAYED",
          );
        }
      }, 3000);
    } else {
      toast({
        title: "Error",
        description: "Failed to open player window. Please allow popups.",
        variant: "destructive",
      });
    }
  };

  const playSong = (
    videoId: string,
    title: string,
    artist: string,
    logType: "SONG_PLAYED" | "USER_SELECTION",
  ) => {
    console.log(`[PlaySong] Starting: ${videoId} - ${title} by ${artist}`);

    if (state.playerWindow && !state.playerWindow.closed) {
      const command = {
        action: "play",
        videoId: videoId,
        title: title,
        artist: artist,
        timestamp: Date.now(),
        testMode: state.testMode,
      };

      try {
        state.playerWindow.localStorage.setItem(
          "jukeboxCommand",
          JSON.stringify(command),
        );

        // Update state immediately with the new video info
        setState((prev) => ({
          ...prev,
          currentlyPlaying: title.replace(/\([^)]*\)/g, "").trim(),
          currentVideoId: videoId,
        }));

        console.log(
          `[PlaySong] Command sent and state updated. VideoID: ${videoId}, TestMode: ${state.testMode}`,
        );

        const description =
          logType === "USER_SELECTION"
            ? `Playing user request: ${title}${state.testMode ? " (TEST MODE - 20s)" : ""}`
            : `Autoplay: ${title}${state.testMode ? " (TEST MODE - 20s)" : ""}`;
        addLog(logType, description, videoId);
      } catch (error) {
        console.error("[PlaySong] Error sending command to player:", error);
      }
    } else {
      console.error("[PlaySong] Player window not available");
      toast({
        title: "Player Not Available",
        description:
          "Player window is not open. Please allow popups and restart the player.",
        variant: "destructive",
      });
      // Try to reinitialize player if playlist is available
      if (state.inMemoryPlaylist.length > 0) {
        console.log("[PlaySong] Attempting to reinitialize player...");
        setTimeout(() => initializePlayer(), 1000);
      }
    }
  };

  const handlePlayerToggle = () => {
    if (!state.playerWindow || state.playerWindow.closed) {
      console.log("Player window is closed, reopening...");
      initializePlayer();
      addLog("SONG_PLAYED", "Player window reopened and started");
      return;
    }

    if (state.isPlayerRunning && !state.isPlayerPaused) {
      // Pause player
      if (state.playerWindow && !state.playerWindow.closed) {
        const command = { action: "pause", timestamp: Date.now() };
        try {
          state.playerWindow.localStorage.setItem(
            "jukeboxCommand",
            JSON.stringify(command),
          );
          addLog("SONG_PLAYED", "Player paused by admin");
        } catch (error) {
          console.error("Error sending pause command:", error);
        }
      }
      setState((prev) => ({ ...prev, isPlayerPaused: true }));
    } else if (state.isPlayerRunning && state.isPlayerPaused) {
      // Resume player
      if (state.playerWindow && !state.playerWindow.closed) {
        const command = { action: "resume", timestamp: Date.now() };
        try {
          state.playerWindow.localStorage.setItem(
            "jukeboxCommand",
            JSON.stringify(command),
          );
          addLog("SONG_PLAYED", "Player resumed by admin");
        } catch (error) {
          console.error("Error sending resume command:", error);
        }
      }
      setState((prev) => ({ ...prev, isPlayerPaused: false }));
    } else {
      // Start player
      setState((prev) => ({
        ...prev,
        isPlayerRunning: true,
        isPlayerPaused: false,
      }));
      if (state.inMemoryPlaylist.length > 0) {
        const firstSong = state.inMemoryPlaylist[0];
        playSong(
          firstSong.videoId,
          firstSong.title,
          firstSong.channelTitle,
          "SONG_PLAYED",
        );
      }
      addLog("SONG_PLAYED", "Player started by admin");
    }
  };

  const handleSkipSong = () => {
    const isUserRequest = state.userRequests.some(
      (req) => req.title === state.currentlyPlaying,
    );
    if (isUserRequest) {
      setState((prev) => ({ ...prev, showSkipConfirmation: true }));
    } else {
      performSkip();
    }
  };

  const performSkip = () => {
    console.log(
      `[PerformSkip] Skipping current video: ${state.currentVideoId}`,
    );

    if (state.playerWindow && !state.playerWindow.closed) {
      const command = {
        action: "fadeOutAndBlack",
        fadeDuration: 3000,
        timestamp: Date.now(),
      };
      try {
        state.playerWindow.localStorage.setItem(
          "jukeboxCommand",
          JSON.stringify(command),
        );
        addLog("SONG_PLAYED", `SKIPPING: ${state.currentlyPlaying}`);
      } catch (error) {
        console.error("Error sending skip command:", error);
      }
    }
    setState((prev) => ({ ...prev, showSkipConfirmation: false }));
  };

  return {
    initializePlayer,
    playSong,
    handlePlayerToggle,
    handleSkipSong,
    performSkip,
  };
};

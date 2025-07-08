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

    // Check if we're in dev mode - if so, create a simple mock player
    if (state.devMode) {
      console.log("[InitializePlayer] DEV MODE - Creating mock player");

      const mockPlayerWindow = {
        closed: false,
        localStorage: {
          setItem: () => console.log("[DevMode] Mock player command received"),
          getItem: () => null,
          removeItem: () => {},
        },
      } as any;

      setState((prev) => ({
        ...prev,
        playerWindow: mockPlayerWindow,
        isPlayerRunning: true,
        currentlyPlaying: "Dev Mode - No Video Playback",
      }));

      console.log("✅ Dev mode mock player created");
      return;
    }

    // For production, attempt to open real player window
    console.log("Attempting to open player window...");
    const playerWindow = window.open(
      "/player.html",
      "JukeboxPlayer",
      "width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no",
    );

    if (playerWindow) {
      setState((prev) => ({ ...prev, playerWindow, isPlayerRunning: true }));
      console.log("Player window opened successfully");

      // Check if window was actually opened (not blocked)
      setTimeout(() => {
        if (playerWindow.closed) {
          console.error("Player window was blocked or closed immediately");
          setState((prev) => ({
            ...prev,
            playerWindow: null,
            isPlayerRunning: false,
          }));
          toast({
            title: "Player Window Blocked",
            description: "Please allow popups for this site and try again.",
            variant: "destructive",
          });
          return;
        }

        // Start first song after a delay to allow player to initialize
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
      console.error(
        "Failed to open player window - likely blocked by popup blocker",
      );
      setState((prev) => ({
        ...prev,
        playerWindow: null,
        isPlayerRunning: false,
      }));
      toast({
        title: "Player Window Blocked",
        description:
          "Please allow popups for this site and click the player toggle to try again.",
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

    // In dev mode, just simulate playing without any actual player
    if (state.devMode) {
      console.log("[PlaySong] DEV MODE - Simulating song play");
      setState((prev) => ({
        ...prev,
        currentlyPlaying: `${title} (DEV MODE)`,
        currentVideoId: videoId,
      }));

      const description =
        logType === "USER_SELECTION"
          ? `DEV MODE - User request: ${title}`
          : `DEV MODE - Autoplay: ${title}`;
      addLog(logType, description, videoId);

      // Auto-advance after 5 seconds in dev mode
      setTimeout(() => {
        console.log("[PlaySong] DEV MODE - Auto-advancing to next song");
        setState((prev) => ({
          ...prev,
          currentlyPlaying: "Dev Mode - Loading Next...",
          currentVideoId: "",
        }));
      }, 5000);

      return;
    }

    // Normal player logic
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

      // If not in dev mode, show error
      if (!state.devMode) {
        toast({
          title: "Player Not Available",
          description:
            "Player window is not open. Please allow popups and restart the player.",
          variant: "destructive",
        });
      }

      // Try to reinitialize player
      console.log("[PlaySong] Attempting to reinitialize player...");
      setTimeout(() => initializePlayer(), 1000);
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
      if (state.playerWindow && !state.playerWindow.closed && !state.devMode) {
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
      if (state.playerWindow && !state.playerWindow.closed && !state.devMode) {
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

    if (state.devMode) {
      console.log("[PerformSkip] DEV MODE - Simulating skip");
      setState((prev) => ({
        ...prev,
        currentlyPlaying: "Dev Mode - Loading Next...",
        currentVideoId: "",
        showSkipConfirmation: false,
      }));
      addLog("SONG_PLAYED", `DEV MODE - SKIPPED: ${state.currentlyPlaying}`);
      return;
    }

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

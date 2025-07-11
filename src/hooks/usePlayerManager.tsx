import { useToast } from "@/hooks/use-toast";
import { JukeboxState, LogEntry } from "./useJukeboxState";
import { displayManager, DisplayInfo } from "@/services/displayManager";

export const usePlayerManager = (
  state: JukeboxState,
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>,
  addLog: (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number,
  ) => void,
  onDisplayConfirmationNeeded?: (
    displayInfo: DisplayInfo,
    onConfirm: (useFullscreen: boolean, rememberChoice: boolean) => void,
    onCancel: () => void,
  ) => void,
) => {
  const { toast } = useToast();

  const initializePlayer = async () => {
    console.log("[InitPlayer] Starting player initialization...");
    console.log("[InitPlayer] Current state:", {
      hasWindow: !!state.playerWindow,
      windowClosed: state.playerWindow?.closed,
      isRunning: state.isPlayerRunning,
    });

    if (state.playerWindow && !state.playerWindow.closed) {
      console.log("[InitPlayer] Player window already exists and is open");
      return;
    }

    // For now, skip external display detection to ensure player always opens
    console.log(
      "[InitPlayer] Using simplified initialization to ensure player opens",
    );

    try {
      // Try to open basic player window first
      console.log("[InitPlayer] Opening basic player window...");
      const playerWindow = window.open(
        "/player.html",
        "JukeboxPlayer",
        "width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no",
      );

      if (playerWindow) {
        console.log("[InitPlayer] Player window opened successfully");
        setState((prev) => ({
          ...prev,
          playerWindow,
          isPlayerRunning: true,
        }));

        // Start first song after initialization delay
        setTimeout(() => {
          console.log("[InitPlayer] Auto-starting first song");
          if (state.inMemoryPlaylist.length > 0) {
            const firstSong = state.inMemoryPlaylist[0];
            playSong(
              firstSong.videoId,
              firstSong.title,
              firstSong.channelTitle,
              "SONG_PLAYED",
              0,
            );
          }
        }, 3000);

        addLog("SONG_PLAYED", "Player window opened successfully");

        toast({
          title: "Player Started",
          description: "Video player window opened successfully",
          variant: "default",
        });
      } else {
        console.error(
          "[InitPlayer] Failed to open player window - likely popup blocked",
        );
        toast({
          title: "Popup Blocked",
          description:
            "Please allow popups for this site and try again using the 'Open Player' button in admin panel.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[InitPlayer] Error during player initialization:", error);
      toast({
        title: "Player Error",
        description:
          "Failed to initialize player window. Please try manually opening from admin panel.",
        variant: "destructive",
      });
    }
  };

  const openPlayerWindow = (display: DisplayInfo, fullscreen: boolean) => {
    console.log(
      `Opening player window on ${display.name} (${fullscreen ? "fullscreen" : "windowed"})`,
    );

    const features = displayManager.generateWindowFeatures(display, fullscreen);
    const playerWindow = window.open("/player.html", "JukeboxPlayer", features);

    if (playerWindow) {
      setState((prev) => ({ ...prev, playerWindow, isPlayerRunning: true }));
      console.log("Player window opened successfully on external display");

      // Request fullscreen after window loads if needed
      if (fullscreen) {
        playerWindow.addEventListener("load", () => {
          setTimeout(() => {
            try {
              playerWindow.document.documentElement.requestFullscreen();
            } catch (error) {
              console.warn("Could not enter fullscreen mode:", error);
            }
          }, 1000);
        });
      }

      // Start first song after initialization
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
            0,
          );
        }
      }, 3000);

      addLog(
        "SONG_PLAYED",
        `Player opened on ${display.name}${fullscreen ? " (fullscreen)" : ""}`,
      );

      toast({
        title: "Player Started",
        description: `Video player opened on ${display.name}${fullscreen ? " in fullscreen mode" : ""}`,
        variant: "default",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to open player window. Please allow popups.",
        variant: "destructive",
      });
    }
  };

  const openBasicPlayerWindow = () => {
    console.log("Opening basic player window as fallback");
    const playerWindow = window.open(
      "/player.html",
      "JukeboxPlayer",
      "width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no",
    );

    if (playerWindow) {
      setState((prev) => ({ ...prev, playerWindow, isPlayerRunning: true }));
      console.log("Basic player window opened successfully");

      setTimeout(() => {
        if (state.inMemoryPlaylist.length > 0) {
          const firstSong = state.inMemoryPlaylist[0];
          playSong(
            firstSong.videoId,
            firstSong.title,
            firstSong.channelTitle,
            "SONG_PLAYED",
            0,
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
    retryCount: number = 0,
  ) => {
    const MAX_RETRIES = 2;

    console.log(
      `[PlaySong] Starting: ${videoId} - ${title} by ${artist} (retry: ${retryCount})`,
    );

    // Prevent infinite loops by limiting retries
    if (retryCount >= MAX_RETRIES) {
      console.error("[PlaySong] Maximum retry attempts reached, stopping");
      toast({
        title: "Player Error",
        description:
          "Unable to play song after multiple attempts. Please open player manually.",
        variant: "destructive",
      });
      return;
    }

    // Use setState callback to get current state and avoid stale closures
    setState((currentState) => {
      console.log(`[PlaySong] Current player window state:`, {
        exists: !!currentState.playerWindow,
        closed: currentState.playerWindow?.closed,
        isPlayerRunning: currentState.isPlayerRunning,
      });

      // If no player window exists, try to create one immediately
      if (!currentState.playerWindow || currentState.playerWindow.closed) {
        console.warn(
          "[PlaySong] No player window available, creating one now...",
        );

        // Try to open player window immediately
        const emergencyPlayerWindow = window.open(
          "/player.html",
          "JukeboxPlayer",
          "width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no",
        );

        if (emergencyPlayerWindow) {
          console.log(
            "[PlaySong] Emergency player window created successfully",
          );

          // Update state with new window
          const newState = {
            ...currentState,
            playerWindow: emergencyPlayerWindow,
            isPlayerRunning: true,
          };

          // Wait for window to load before retrying
          emergencyPlayerWindow.addEventListener("load", () => {
            console.log("[PlaySong] Emergency window loaded, retrying song");
            setTimeout(() => {
              playSong(videoId, title, artist, logType, retryCount + 1);
            }, 1000);
          });

          // Fallback timeout in case load event doesn't fire
          setTimeout(() => {
            console.log("[PlaySong] Fallback retry with emergency window");
            playSong(videoId, title, artist, logType, retryCount + 1);
          }, 3000);

          return newState;
        } else {
          console.error("[PlaySong] Could not create emergency player window");
          toast({
            title: "Player Window Required",
            description:
              "Please click 'Open Player' in the admin panel to start the video player.",
            variant: "destructive",
          });
          return currentState;
        }
      }

      // Player window exists and is not closed, send play command
      if (currentState.playerWindow && !currentState.playerWindow.closed) {
        const command = {
          action: "play",
          videoId: videoId,
          title: title,
          artist: artist,
          timestamp: Date.now(),
          testMode: currentState.testMode,
        };

        try {
          currentState.playerWindow.localStorage.setItem(
            "jukeboxCommand",
            JSON.stringify(command),
          );

          console.log(
            `[PlaySong] Command sent successfully. VideoID: ${videoId}, TestMode: ${currentState.testMode}`,
          );

          const description =
            logType === "USER_SELECTION"
              ? `Playing user request: ${title}${currentState.testMode ? " (TEST MODE - 20s)" : ""}`
              : `Autoplay: ${title}${currentState.testMode ? " (TEST MODE - 20s)" : ""}`;
          addLog(logType, description, videoId);

          // Update state with new video info
          return {
            ...currentState,
            currentlyPlaying: title.replace(/\([^)]*\)/g, "").trim(),
            currentVideoId: videoId,
          };
        } catch (error) {
          console.error("[PlaySong] Error sending command to player:", error);
          return currentState;
        }
      } else {
        console.error("[PlaySong] Player window not available for retry");
        console.log("[PlaySong] Current state details:", {
          playerWindow: currentState.playerWindow,
          isPlayerRunning: currentState.isPlayerRunning,
          windowClosed: currentState.playerWindow?.closed,
          windowExists: !!currentState.playerWindow,
        });

        toast({
          title: "Player Window Missing",
          description:
            "Player window not available. Please use admin panel to open player.",
          variant: "destructive",
        });

        return currentState;
      }
    });
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
          0,
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

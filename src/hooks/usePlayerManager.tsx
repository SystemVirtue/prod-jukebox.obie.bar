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
    if (state.playerWindow && !state.playerWindow.closed) {
      console.log("Player window already exists");
      return;
    }

    try {
      // Check for external displays
      const displayConfig = await displayManager.getRecommendedDisplayConfig();
      const externalDisplay = await displayManager.getBestExternalDisplay();
      const preference = displayManager.getDisplayPreference();

      // If external display available and not previously declined
      if (
        externalDisplay &&
        !preference.rememberedChoice &&
        onDisplayConfirmationNeeded
      ) {
        console.log("External display detected, requesting user confirmation");

        onDisplayConfirmationNeeded(
          externalDisplay,
          (useFullscreen: boolean, rememberChoice: boolean) => {
            // User confirmed external display
            const newPreference = {
              preferExternal: true,
              fullscreen: useFullscreen,
              rememberedChoice: rememberChoice,
              lastUsedDisplay: externalDisplay.id,
            };

            if (rememberChoice) {
              displayManager.saveDisplayPreference(newPreference);
            }

            openPlayerWindow(externalDisplay, useFullscreen);
          },
          () => {
            // User declined external display
            const primaryDisplay = displayConfig.display;
            openPlayerWindow(primaryDisplay, false);
          },
        );
        return;
      }

      // Use remembered preference or default display
      const targetDisplay =
        externalDisplay && preference.preferExternal
          ? externalDisplay
          : displayConfig.display;
      const useFullscreen = preference.preferExternal && preference.fullscreen;

      openPlayerWindow(targetDisplay, useFullscreen);
    } catch (error) {
      console.error("Error during display detection:", error);
      // Fallback to basic window opening
      openBasicPlayerWindow();
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
        title: "Player Window Missing",
        description: "Player window was closed. Attempting to reopen...",
        variant: "default",
      });

      // Attempt to reinitialize the player
      console.log("[PlaySong] Attempting to reinitialize player window");
      initializePlayer();

      // Retry playing the song after a short delay
      setTimeout(() => {
        if (state.playerWindow && !state.playerWindow.closed) {
          console.log("[PlaySong] Retrying song play after player recovery");
          playSong(videoId, title, artist, logType);
        } else {
          toast({
            title: "Player Recovery Failed",
            description:
              "Could not reopen player window. Please check popup blockers.",
            variant: "destructive",
          });
        }
      }, 3000);
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

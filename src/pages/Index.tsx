import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SearchInterface } from "@/components/SearchInterface";
import { IframeSearchInterface } from "@/components/IframeSearchInterface";
import "@/utils/emergencyFallback";
import { InsufficientCreditsDialog } from "@/components/InsufficientCreditsDialog";
import { DuplicateSongDialog } from "@/components/DuplicateSongDialog";
import { AdminConsole } from "@/components/AdminConsole";
import { useSerialCommunication } from "@/components/SerialCommunication";
import {
  useBackgroundManager,
  BackgroundDisplay,
} from "@/components/BackgroundManager";
import { useJukeboxState } from "@/hooks/useJukeboxState";
import { usePlayerManager } from "@/hooks/usePlayerManager";
import { usePlaylistManager } from "@/hooks/usePlaylistManager";
import { useVideoSearch } from "@/hooks/useVideoSearch";
import { useApiKeyRotation } from "@/hooks/useApiKeyRotation";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { DisplayConfirmationDialog } from "@/components/DisplayConfirmationDialog";
import { QuotaExhaustedDialog } from "@/components/QuotaExhaustedDialog";
import { ApiKeyTestDialog } from "@/components/ApiKeyTestDialog";
import { DisplayInfo } from "@/services/displayManager";
import { youtubeQuotaService } from "@/services/youtubeQuota";

const Index = () => {
  const { toast } = useToast();
  const {
    state,
    setState,
    addLog,
    addUserRequest,
    addCreditHistory,
    handleBackgroundUpload,
    getUpcomingTitles,
    isCurrentSongUserRequest,
    getCurrentPlaylistForDisplay,
  } = useJukeboxState();

  // Display confirmation callbacks - must be defined before usePlayerManager
  const [pendingDisplayConfirmation, setPendingDisplayConfirmation] = useState<{
    displayInfo: DisplayInfo;
    onConfirm: (useFullscreen: boolean, rememberChoice: boolean) => void;
    onCancel: () => void;
  } | null>(null);

  const handleDisplayConfirmationNeeded = useCallback(
    (
      displayInfo: DisplayInfo,
      onConfirm: (useFullscreen: boolean, rememberChoice: boolean) => void,
      onCancel: () => void,
    ) => {
      setPendingDisplayConfirmation({ displayInfo, onConfirm, onCancel });
    },
    [],
  );

  const handleDisplayConfirmationResponse = useCallback(
    (useFullscreen: boolean, rememberChoice: boolean) => {
      if (pendingDisplayConfirmation) {
        pendingDisplayConfirmation.onConfirm(useFullscreen, rememberChoice);
        setPendingDisplayConfirmation(null);
      }
    },
    [pendingDisplayConfirmation],
  );

  const handleDisplayConfirmationCancel = useCallback(() => {
    if (pendingDisplayConfirmation) {
      pendingDisplayConfirmation.onCancel();
      setPendingDisplayConfirmation(null);
    }
  }, [pendingDisplayConfirmation]);

  const {
    initializePlayer,
    playSong,
    handlePlayerToggle,
    handleSkipSong,
    performSkip,
  } = usePlayerManager(
    state,
    setState,
    addLog,
    handleDisplayConfirmationNeeded,
  );

  const {
    loadPlaylistVideos,
    playNextSong,
    handleVideoEnded,
    handleDefaultPlaylistChange,
    handlePlaylistReorder,
    handlePlaylistShuffle,
  } = usePlaylistManager(state, setState, addLog, playSong, toast);

  const {
    trackApiUsageWithRotation,
    checkAndRotateIfNeeded,
    getAllKeysStatus,
  } = useApiKeyRotation(state, setState, toast);

  // Handle all keys exhausted callback
  const handleAllKeysExhausted = useCallback(() => {
    console.log("[Quota] All API keys exhausted - pausing app");
    setState((prev) => ({
      ...prev,
      allKeysExhausted: true,
      isAppPaused: true,
    }));
  }, [setState]);

  // Set up quota exhausted callback
  useEffect(() => {
    youtubeQuotaService.setAllKeysExhaustedCallback(handleAllKeysExhausted);

    return () => {
      youtubeQuotaService.setAllKeysExhaustedCallback(null);
    };
  }, [handleAllKeysExhausted]);

  // Handle quota exhausted dialog OK click
  const handleQuotaExhaustedOk = useCallback(() => {
    setState((prev) => ({
      ...prev,
      allKeysExhausted: false,
      isAppPaused: false,
    }));
  }, [setState]);

  // Handle API key test dialog completion
  const handleApiKeyTestComplete = useCallback(
    (results: any[]) => {
      console.log("[Init] API key test results:", results);

      // Find the first working key (status === "success")
      const workingKey = results.find((r) => r.status === "success");

      if (workingKey) {
        console.log(
          `[Init] Found working key: ...${workingKey.key.slice(-8)} (${workingKey.keyName})`,
        );

        // Map the key name to the correct option
        let selectedOption = "key1";
        if (workingKey.keyName.includes("Key 1")) selectedOption = "key1";
        else if (workingKey.keyName.includes("Key 2")) selectedOption = "key2";
        else if (workingKey.keyName.includes("Key 3")) selectedOption = "key3";
        else if (workingKey.keyName.includes("Key 4")) selectedOption = "key4";
        else if (workingKey.keyName.includes("Key 5")) selectedOption = "key5";

        console.log(
          `[Init] Setting API key to ${selectedOption} with key ...${workingKey.key.slice(-8)}`,
        );

        setState((prev) => ({
          ...prev,
          apiKey: workingKey.key,
          selectedApiKeyOption: selectedOption,
          showApiKeyTestDialog: false,
        }));

        // Show success message
        toast({
          title: "API Key Selected",
          description: `Using ${workingKey.keyName} - Quota: ${workingKey.quotaUsage?.used || 0}/${workingKey.quotaUsage?.limit || 10000} (${workingKey.quotaUsage?.percentage?.toFixed(1) || 0}%)`,
          variant: "default",
        });
      } else {
        console.log(
          "[Init] NO working keys found - ALL keys failed! Using HTML parser fallback mode",
        );

        // DO NOT open admin panel - use HTML parser instead
        setState((prev) => ({
          ...prev,
          showApiKeyTestDialog: false,
          // DO NOT set isAdminOpen: true
        }));

        // Show fallback mode message
        toast({
          title: "Fallback Mode Active",
          description:
            "All YouTube API keys quota exceeded. Loading curated playlist without API usage.",
          variant: "default",
        });

        // Immediately load playlist using HTML parser - bypass API key requirement
        console.log(
          "[Init] Loading fallback playlist using HTML parser for:",
          state.defaultPlaylist,
        );

        // Import and use HTML parser directly since we have no working API keys
        import("@/services/youtubeHtmlParser").then(
          ({ youtubeHtmlParserService }) => {
            youtubeHtmlParserService
              .parsePlaylist(state.defaultPlaylist)
              .then((fallbackVideos) => {
                console.log(
                  `[Init] HTML parser generated ${fallbackVideos.length} fallback videos`,
                );

                setState((prev) => ({
                  ...prev,
                  defaultPlaylistVideos: fallbackVideos,
                  inMemoryPlaylist: [...fallbackVideos],
                  currentVideoIndex: 0,
                }));

                addLog(
                  "SONG_PLAYED",
                  `Loaded HTML parser playlist with ${fallbackVideos.length} songs due to quota exhaustion`,
                );

                toast({
                  title: "Playlist Loaded",
                  description: `Loaded ${fallbackVideos.length} popular songs using fallback mode.`,
                  variant: "default",
                });
              })
              .catch((error) => {
                console.error("[Init] HTML parser failed:", error);
                toast({
                  title: "Fallback Failed",
                  description:
                    "Unable to load fallback playlist. Please refresh the page.",
                  variant: "destructive",
                });
              });
          },
        );
      }
    },
    [setState, toast],
  );

  const {
    performSearch,
    filterForOfficial,
    handleVideoSelect,
    confirmAddToPlaylist,
    handleKeyboardInput,
    confirmDialog,
    setConfirmDialog,
  } = useVideoSearch(
    state,
    setState,
    addLog,
    addUserRequest,
    addCreditHistory,
    toast,
    checkAndRotateIfNeeded,
  );

  // Periodic check for rotation (every 5 minutes)
  useEffect(() => {
    if (!state.autoRotateApiKeys) return;

    const interval = setInterval(
      () => {
        checkAndRotateIfNeeded();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [state.autoRotateApiKeys, checkAndRotateIfNeeded]);

  // Use refs to store latest values for the storage event handler
  const stateRef = useRef(state);
  const handleVideoEndedRef = useRef(handleVideoEnded);

  // Update refs whenever values change
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    handleVideoEndedRef.current = handleVideoEnded;
  }, [handleVideoEnded]);

  // Use background manager hook
  const { getCurrentBackground } = useBackgroundManager({
    backgrounds: state.backgrounds,
    selectedBackground: state.selectedBackground,
    cycleBackgrounds: state.cycleBackgrounds,
    backgroundCycleIndex: state.backgroundCycleIndex,
    bounceVideos: state.bounceVideos,
    onBackgroundCycleIndexChange: (index) =>
      setState((prev) => ({ ...prev, backgroundCycleIndex: index })),
    onSelectedBackgroundChange: (id) =>
      setState((prev) => ({ ...prev, selectedBackground: id })),
  });

  // Use serial communication hook with new props
  useSerialCommunication({
    mode: state.mode,
    selectedCoinAcceptor: state.selectedCoinAcceptor,
    onCreditsChange: (delta) =>
      setState((prev) => ({ ...prev, credits: prev.credits + delta })),

    credits: state.credits,
    onAddLog: addLog,
    coinValueA: state.coinValueA,
    coinValueB: state.coinValueB,
  });

  // Initialize playlist ONLY when API key is properly selected AND playlist changes
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    // Don't initialize if API key test dialog is still open
    if (state.showApiKeyTestDialog) {
      console.log(
        "[Init] Skipping playlist load - API key test dialog is open",
      );
      return;
    }

    // Don't initialize if no valid API key is set
    if (!state.apiKey || state.apiKey.length < 20) {
      console.log("[Init] Skipping playlist load - no valid API key set");
      return;
    }

    // Don't initialize if selectedApiKeyOption is still "custom" (means no proper key selected)
    if (state.selectedApiKeyOption === "custom" && !state.customApiKey) {
      console.log(
        "[Init] Skipping playlist load - API key not properly selected yet",
      );
      return;
    }

    // Only run once after API key is properly set
    if (hasInitialized) {
      return;
    }

    console.log(
      `[Init] Loading initial playlist with selected key: ${state.selectedApiKeyOption} (...${state.apiKey.slice(-8)})`,
    );
    setHasInitialized(true);

    // Check if quota is exhausted for current API key
    const quotaExhaustedKey = `quota-exhausted-${state.apiKey.slice(-8)}`;
    const quotaExhaustedTime = localStorage.getItem(quotaExhaustedKey);
    if (quotaExhaustedTime) {
      const timeSinceExhaustion = Date.now() - parseInt(quotaExhaustedTime);
      // If quota was exhausted recently (within 1 hour), skip loading
      if (timeSinceExhaustion < 3600000) {
        console.log("[Init] API key quota exhausted, skipping playlist load");
        return;
      }
    }

    loadPlaylistVideos(state.defaultPlaylist);
  }, [
    state.showApiKeyTestDialog,
    state.apiKey,
    state.selectedApiKeyOption,
    state.customApiKey,
    hasInitialized,
  ]); // Depend on API key selection state

  // Initialize player only after playlist is loaded and ready
  useEffect(() => {
    console.log("[Auto-init] Checking player initialization conditions:", {
      playlistLength: state.defaultPlaylistVideos.length,
      hasPlayerWindow: !!state.playerWindow,
      isPlayerRunning: state.isPlayerRunning,
      windowClosed: state.playerWindow?.closed,
    });

    // Check if playlist is empty but don't auto-open admin - let API key rotation handle it
    const hasEmptyPlaylist = state.defaultPlaylistVideos.length === 0;

    if (hasEmptyPlaylist && state.apiKey) {
      console.log(
        "[Auto-init] Empty playlist detected - API key rotation will handle this",
      );
      // Don't auto-open admin panel - the API key test dialog already handled key selection
      // If playlist loading fails, rotation will find a working key or exhaust all keys
    }

    // Only auto-initialize if user hasn't manually closed the player recently
    const playerWindowState = localStorage.getItem("jukeboxPlayerWindowState");
    let shouldAutoInit = true;

    if (playerWindowState) {
      try {
        const parsedState = JSON.parse(playerWindowState);
        const timeSinceClose = Date.now() - parsedState.timestamp;
        // Don't auto-init if user closed it recently (within 5 minutes)
        if (parsedState.isClosed && timeSinceClose < 300000) {
          shouldAutoInit = false;
        }
      } catch (error) {
        // If we can't parse, assume we should auto-init
        shouldAutoInit = true;
      }
    }

    if (
      state.defaultPlaylistVideos.length > 0 &&
      (!state.playerWindow || state.playerWindow.closed) &&
      !state.isPlayerRunning &&
      shouldAutoInit
    ) {
      console.log(
        "[Auto-init] Playlist loaded with",
        state.defaultPlaylistVideos.length,
        "videos. Initializing player...",
      );

      // Try initialization with a more permissive approach
      let retryCount = 0;
      const maxRetries = 0; // Don't retry automatically to avoid being aggressive

      const tryInitialization = async () => {
        console.log(`[Auto-init] Attempt ${retryCount + 1}/${maxRetries + 1}`);

        try {
          await initializePlayer();

          // Check if player was successfully created
          setTimeout(() => {
            setState((currentState) => {
              if (
                !currentState.playerWindow ||
                currentState.playerWindow.closed
              ) {
                retryCount++;
                if (retryCount <= maxRetries) {
                  console.log(
                    `[Auto-init] Retry ${retryCount}/${maxRetries} in 2 seconds...`,
                  );
                  setTimeout(tryInitialization, 2000);
                } else {
                  console.error(
                    "[Auto-init] Failed to initialize player after all retries",
                  );
                  // Only show this message if we actually tried to initialize
                  if (retryCount > 0) {
                    toast({
                      title: "Player Window Blocked",
                      description:
                        "Browser blocked the player window. Please allow popups for this site, then click 'Open Player' in the admin panel (Settings icon bottom-left).",
                      variant: "default",
                      duration: 6000,
                    });
                  }
                }
              } else {
                console.log("[Auto-init] Player successfully initialized!");
              }
              return currentState;
            });
          }, 1500);
        } catch (error) {
          console.error("[Auto-init] Error during initialization:", error);
          retryCount++;
          if (retryCount <= maxRetries) {
            setTimeout(tryInitialization, 2000);
          }
        }
      };

      // Start with a small delay
      setTimeout(tryInitialization, 500);
    } else {
      console.log("[Auto-init] Skipping initialization - conditions not met");
    }
  }, [
    state.defaultPlaylistVideos.length,
    state.playerWindow,
    state.isPlayerRunning,
    initializePlayer,
    toast,
  ]);

  // Enhanced autoplay logic - only start when player is ready and playlist has songs
  const hasStartedFirstSongRef = useRef(false);
  useEffect(() => {
    if (
      state.inMemoryPlaylist.length > 0 &&
      state.priorityQueue.length === 0 &&
      state.isPlayerRunning &&
      !state.isPlayerPaused &&
      state.playerWindow &&
      !state.playerWindow.closed
    ) {
      // Only auto-start if nothing is currently playing and not already started
      if (
        (state.currentlyPlaying === "Loading..." ||
          state.currentlyPlaying === "") &&
        !hasStartedFirstSongRef.current
      ) {
        hasStartedFirstSongRef.current = true;
        console.log("Auto-starting first song from playlist...");
        console.log("Current playlist state:", {
          inMemoryLength: state.inMemoryPlaylist.length,
          firstSong: state.inMemoryPlaylist[0]?.title,
          priorityQueue: state.priorityQueue.length,
        });
        // Defer to next tick to prevent setState during render
        setTimeout(() => playNextSong(), 0);
      }
    } else {
      // Reset flag if player or playlist is not ready
      hasStartedFirstSongRef.current = false;
    }
  }, [
    state.inMemoryPlaylist,
    state.priorityQueue,
    state.isPlayerRunning,
    state.isPlayerPaused,
    state.playerWindow,
    state.currentlyPlaying,
  ]);

  // Enhanced video end handling with proper queue management and improved sync
  const handleStorageChange = useCallback(
    (event: StorageEvent) => {
      if (event.key === "jukeboxStatus" && event.newValue) {
        const status = JSON.parse(event.newValue);
        const currentState = stateRef.current;
        console.log("[StorageEvent] Parsed status:", status);
        console.log(
          "[StorageEvent] Current video ID in state:",
          currentState.currentVideoId,
        );

        // Update currently playing based on player window communication - ensure proper sync
        if (status.status === "playing" && status.title && status.videoId) {
          const cleanTitle = status.title.replace(/\([^)]*\)/g, "").trim();
          console.log(
            "[StorageEvent] Updating currently playing to:",
            cleanTitle,
            "VideoID:",
            status.videoId,
          );
          setState((prev) => ({
            ...prev,
            currentlyPlaying: cleanTitle,
            currentVideoId: status.videoId,
          }));

          // Force update of coming up titles by triggering a state refresh
          setTimeout(() => {
            setState((prev) => ({ ...prev }));
          }, 100);
        }

        // Handle video ended - ensure proper progression to next song
        if (status.status === "ended" || status.status === "testModeComplete") {
          const statusVideoId = status.id || status.videoId;
          console.log(
            "[StorageEvent] Video ended/testModeComplete. Status video ID:",
            statusVideoId,
          );
          console.log(
            "[StorageEvent] Current state video ID:",
            currentState.currentVideoId,
          );

          if (statusVideoId && statusVideoId === currentState.currentVideoId) {
            console.log("[StorageEvent] Video IDs match, processing end event");
            setState((prev) => ({
              ...prev,
              currentlyPlaying: "Loading...",
              currentVideoId: "",
            }));

            // Ensure autoplay of next song
            setTimeout(() => {
              console.log(
                "[StorageEvent] Triggering handleVideoEnded for autoplay",
              );
              handleVideoEndedRef.current();

              // Force update of coming up titles after video change
              setTimeout(() => {
                setState((prev) => ({ ...prev }));
              }, 500);
            }, 500);
          } else {
            console.log("[StorageEvent] Video ID mismatch, ignoring end event");
          }
        }

        // Handle fade complete
        if (status.status === "fadeComplete") {
          const statusVideoId = status.id;
          console.log(
            "[StorageEvent] Fade complete. Status video ID:",
            statusVideoId,
          );

          if (statusVideoId && statusVideoId === currentState.currentVideoId) {
            console.log(
              "[StorageEvent] Fade complete for current video, processing autoplay",
            );
            setState((prev) => ({
              ...prev,
              currentlyPlaying: "Loading...",
              currentVideoId: "",
            }));

            setTimeout(() => {
              console.log(
                "[StorageEvent] Triggering handleVideoEnded after fade",
              );
              handleVideoEndedRef.current();

              // Force update of coming up titles after skip
              setTimeout(() => {
                setState((prev) => ({ ...prev }));
              }, 500);
            }, 500);
          }
        }

        // Handle video unavailable/error - auto-skip with enhanced sync
        if (status.status === "error" || status.status === "unavailable") {
          const statusVideoId = status.id;
          console.log(
            "[StorageEvent] Video error/unavailable. Status video ID:",
            statusVideoId,
          );

          if (statusVideoId && statusVideoId === currentState.currentVideoId) {
            console.log("[StorageEvent] Auto-skipping unavailable video");
            addLog(
              "SONG_PLAYED",
              `Auto-skipping unavailable video: ${currentState.currentlyPlaying}`,
            );
            setState((prev) => ({
              ...prev,
              currentlyPlaying: "Loading...",
              currentVideoId: "",
            }));

            setTimeout(() => {
              console.log(
                "[StorageEvent] Triggering handleVideoEnded after error",
              );
              handleVideoEndedRef.current();

              // Force update of coming up titles after error skip
              setTimeout(() => {
                setState((prev) => ({ ...prev }));
              }, 500);
            }, 1000);
          }
        }

        // Handle player ready status
        if (status.status === "ready") {
          console.log("[StorageEvent] Player window ready.");
        }
      }

      // Listen for player window commands to track what's playing - prevent duplication
      if (event.key === "jukeboxCommand" && event.newValue) {
        const command = JSON.parse(event.newValue);
        if (command.action === "play" && command.title && command.videoId) {
          console.log(
            "[StorageEvent] Play command detected:",
            command.videoId,
            command.title,
          );
          const cleanTitle = command.title.replace(/\([^)]*\)/g, "").trim();
          setState((prev) => ({
            ...prev,
            currentlyPlaying: cleanTitle,
            currentVideoId: command.videoId,
          }));

          // Force update of coming up titles when new song starts
          setTimeout(() => {
            setState((prev) => ({ ...prev }));
          }, 100);
        }
      }
    },
    [setState, addLog],
  );

  useEffect(() => {
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [handleStorageChange]);

  // Emergency recovery event listener
  useEffect(() => {
    const handleEmergencyPlaylistInject = (event: any) => {
      console.log("[Emergency] Received emergency playlist injection");
      const { playlist } = event.detail;

      if (playlist && Array.isArray(playlist)) {
        setState((prev) => ({
          ...prev,
          defaultPlaylistVideos: playlist,
          inMemoryPlaylist: [...playlist],
          currentVideoIndex: 0,
        }));

        toast({
          title: "Emergency Recovery",
          description: `Injected ${playlist.length} songs from emergency fallback playlist.`,
          variant: "default",
        });

        console.log(
          `[Emergency] Successfully injected ${playlist.length} songs`,
        );
      }
    };

    window.addEventListener(
      "emergency-playlist-inject",
      handleEmergencyPlaylistInject,
    );
    return () =>
      window.removeEventListener(
        "emergency-playlist-inject",
        handleEmergencyPlaylistInject,
      );
  }, [setState, toast]);

  const currentBackground = getCurrentBackground();

  // Determine when to show the loading indicator
  const isLoading =
    // When API key test dialog is open
    state.showApiKeyTestDialog ||
    // When the application is initializing
    state.defaultPlaylistVideos.length === 0 ||
    // When playlist is loading
    state.currentlyPlaying === "Loading..." ||
    // When searching for videos
    state.isSearching ||
    // When player is not running yet
    (!state.isPlayerRunning && state.defaultPlaylistVideos.length > 0);

  return (
    <BackgroundDisplay
      background={currentBackground}
      bounceVideos={state.bounceVideos}
    >
      <LoadingIndicator isVisible={isLoading} />
      <CreditsDisplay credits={state.credits} mode={state.mode} />
      <div className="relative z-10 min-h-screen p-8 flex flex-col">
        {/* Now Playing Ticker - Responsive positioning and sizing */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20 max-w-[calc(100vw-1rem)] sm:max-w-none">
          <Card className="bg-black/60 border-yellow-400 shadow-lg backdrop-blur-sm">
            <CardContent className="p-2 sm:p-3">
              <div className="text-amber-100 font-bold text-sm sm:text-lg w-[calc(100vw-4rem)] sm:w-[30.7rem] truncate">
                Now Playing: {state.currentlyPlaying}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player Closed Notification - Responsive positioning */}
        {(!state.playerWindow || state.playerWindow.closed) &&
          state.isPlayerRunning && (
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 max-w-[calc(100vw-1rem)] sm:max-w-none">
              <Card className="bg-red-900/80 border-red-400 shadow-lg backdrop-blur-sm">
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-col sm:flex-row">
                    <div className="text-red-100 font-medium text-xs sm:text-sm text-center sm:text-left">
                      ⚠️ Player Window Closed
                    </div>
                    <Button
                      onClick={() => {
                        console.log(
                          "Reopening player window from notification",
                        );
                        initializePlayer();
                      }}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 sm:px-3 sm:py-1 h-auto w-full sm:w-auto"
                    >
                      Reopen Player
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        {/* Credits display has been moved to the CreditsDisplay component */}

        <div className="text-center mb-8">
          {/* Main UI text has been hidden as requested */}

          {/* Mini Player - Responsive sizing */}
          {state.showMiniPlayer && state.currentVideoId && (
            <div className="flex justify-center mb-4 sm:mb-8 px-4">
              <div className="relative w-40 h-24 sm:w-48 sm:h-27 rounded-lg overflow-hidden shadow-2xl">
                {/* Vignette overlay for feathered edges */}
                <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_30px_10px_rgba(0,0,0,0.6)] z-10 pointer-events-none"></div>
                <iframe
                  src={`https://www.youtube.com/embed/${state.currentVideoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1`}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen={false}
                  style={{ pointerEvents: "none" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Search button positioned above footer with 50px margin */}
        <div className="flex-1 flex items-center justify-center">
          {/* This div keeps the original centering in the flex-1 space */}
        </div>

        {/* Responsive search button */}
        <div className="fixed bottom-[calc(2rem+50px)] left-4 right-4 sm:left-0 sm:right-0 flex justify-center z-20">
          <Button
            onClick={() => {
              console.log("Search button clicked - opening search interface");
              setState((prev) => ({
                ...prev,
                isSearchOpen: true,
                showKeyboard: true,
                showSearchResults: false,
              }));
            }}
            className="w-full max-w-96 h-16 sm:h-24 text-xl sm:text-3xl font-bold bg-black/60 text-white shadow-lg border-2 sm:border-4 border-yellow-400 rounded-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden"
            style={{ filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))" }}
          >
            <span
              className="absolute inset-0 bg-black/60 pointer-events-none"
              style={{ zIndex: 0 }}
            ></span>
            <span className="relative z-10">🎵 Search for Music 🎵</span>
          </Button>
        </div>

        {/* Test Mode Indicator - positioned above Coming Up ticker */}
        {state.testMode && (
          <div className="fixed bottom-16 left-0 right-0 flex justify-center z-30">
            <Card className="bg-yellow-600/90 border-yellow-400 backdrop-blur-sm">
              <CardContent className="p-2 px-4">
                <div className="text-yellow-100 font-bold text-lg">
                  TEST MODE ON - 20 Second Videos
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Coming Up Ticker - Responsive bottom ticker */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-amber-200 py-1 sm:py-2 overflow-hidden">
          <div
            className="whitespace-nowrap animate-marquee"
            key={`${state.currentlyPlaying}-${state.priorityQueue.length}-${state.inMemoryPlaylist.length}`}
          >
            <span className="text-sm sm:text-lg font-bold">COMING UP: </span>
            {getUpcomingTitles().map((title, index) => (
              <span
                key={`${index}-${title}`}
                className="mx-4 sm:mx-8 text-sm sm:text-lg"
              >
                {index + 1}. {title}
              </span>
            ))}
          </div>
        </div>

        {/* Responsive admin button */}
        <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState((prev) => ({ ...prev, isAdminOpen: true }))}
            className="text-amber-200 hover:text-amber-100 opacity-30 hover:opacity-100 p-1 sm:p-2"
          >
            <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {/* Skip Confirmation Dialog */}
      <Dialog
        open={state.showSkipConfirmation}
        onOpenChange={(open) =>
          !open &&
          setState((prev) => ({ ...prev, showSkipConfirmation: false }))
        }
      >
        <DialogContent className="bg-gradient-to-b from-amber-50 to-amber-100 border-amber-600">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-900">
              Skip User Selection?
            </DialogTitle>
            <DialogDescription className="text-amber-800">
              Confirm if you want to skip the current user-requested song.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-amber-800">
              Current song is a user selection. Are you sure you want to skip to
              the next song?
            </p>
          </div>

          <DialogFooter className="flex gap-4">
            <Button
              variant="outline"
              onClick={() =>
                setState((prev) => ({ ...prev, showSkipConfirmation: false }))
              }
              className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              No
            </Button>
            <Button
              onClick={performSkip}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Yes, Skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conditionally render search interface based on search method */}
      {state.searchMethod === "iframe_search" ? (
        <IframeSearchInterface
          isOpen={state.isSearchOpen}
          onClose={() => {
            console.log("Iframe search interface closing");
            setState((prev) => ({
              ...prev,
              isSearchOpen: false,
              showKeyboard: false,
              showSearchResults: false,
              searchQuery: "",
              searchResults: [],
            }));
          }}
          searchQuery={state.searchQuery}
          onSearchQueryChange={(query) => {
            console.log("Iframe search query changed:", query);
            setState((prev) => ({ ...prev, searchQuery: query }));
          }}
          showKeyboard={state.showKeyboard}
          showSearchResults={state.showSearchResults}
          onKeyboardInput={handleKeyboardInput}
          onVideoSelect={handleVideoSelect}
          onBackToSearch={() => {
            console.log("Back to iframe search pressed");
            setState((prev) => ({
              ...prev,
              showSearchResults: false,
              showKeyboard: true,
            }));
          }}
          mode={state.mode}
          credits={state.credits}
          onInsufficientCredits={() =>
            setState((prev) => ({ ...prev, showInsufficientCredits: true }))
          }
        />
      ) : (
        <SearchInterface
          isOpen={state.isSearchOpen}
          onClose={() => {
            console.log("API search interface closing");
            setState((prev) => ({
              ...prev,
              isSearchOpen: false,
              showKeyboard: false,
              showSearchResults: false,
              searchQuery: "",
              searchResults: [],
            }));
          }}
          searchQuery={state.searchQuery}
          onSearchQueryChange={(query) => {
            console.log("API search query changed:", query);
            setState((prev) => ({ ...prev, searchQuery: query }));
          }}
          searchResults={state.searchResults}
          isSearching={state.isSearching}
          showKeyboard={state.showKeyboard}
          showSearchResults={state.showSearchResults}
          onKeyboardInput={handleKeyboardInput}
          onVideoSelect={handleVideoSelect}
          onBackToSearch={() => {
            console.log("Back to API search pressed");
            setState((prev) => ({
              ...prev,
              showSearchResults: false,
              showKeyboard: true,
            }));
          }}
          mode={state.mode}
          credits={state.credits}
          onInsufficientCredits={() =>
            setState((prev) => ({ ...prev, showInsufficientCredits: true }))
          }
        />
      )}

      {/* Insufficient Credits Dialog */}
      <InsufficientCreditsDialog
        isOpen={state.showInsufficientCredits}
        onClose={() =>
          setState((prev) => ({
            ...prev,
            showInsufficientCredits: false,
            isSearchOpen: false,
            showKeyboard: false,
            showSearchResults: false,
            searchQuery: "",
            searchResults: [],
          }))
        }
      />

      {/* Duplicate Song Dialog */}
      <DuplicateSongDialog
        isOpen={state.showDuplicateSong}
        onClose={() =>
          setState((prev) => ({
            ...prev,
            showDuplicateSong: false,
            duplicateSongTitle: "",
          }))
        }
        songTitle={state.duplicateSongTitle}
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ isOpen: false, video: null })
        }
      >
        <DialogContent className="bg-gradient-to-b from-amber-50 to-amber-100 border-amber-600">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-900">
              Add song to Playlist?
            </DialogTitle>
            <DialogDescription className="text-amber-800">
              Confirm adding this song to your playlist for playback.
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.video && (
            <div className="py-4">
              <div className="flex gap-3">
                <img
                  src={confirmDialog.video.thumbnailUrl}
                  alt={confirmDialog.video.title}
                  className="w-20 h-15 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold text-amber-900">
                    {confirmDialog.video.title}
                  </h3>
                  <p className="text-amber-700">
                    {confirmDialog.video.channelTitle}
                  </p>
                  {confirmDialog.video.duration && (
                    <p className="text-amber-600 text-sm">
                      {confirmDialog.video.duration}
                    </p>
                  )}
                  {state.mode === "PAID" && (
                    <p className="text-sm text-amber-600 mt-1">
                      Cost: 1 Credit
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ isOpen: false, video: null })}
              className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              No
            </Button>
            <Button
              onClick={confirmAddToPlaylist}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConsole
        isOpen={state.isAdminOpen}
        onClose={() => setState((prev) => ({ ...prev, isAdminOpen: false }))}
        mode={state.mode}
        onModeChange={(mode) => setState((prev) => ({ ...prev, mode }))}
        credits={state.credits}
        onCreditsChange={(credits) =>
          setState((prev) => ({ ...prev, credits }))
        }
        apiKey={state.apiKey}
        onApiKeyChange={(apiKey) => setState((prev) => ({ ...prev, apiKey }))}
        selectedApiKeyOption={state.selectedApiKeyOption}
        onApiKeyOptionChange={(option) => {
          const API_KEY_OPTIONS = {
            key1: "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4",
            key2: "AIzaSyCKHHGkaztp8tfs2BVxiny0InE_z-kGDtY",
            key3: "AIzaSyDy6_QI9SP5nOZRVoNa5xghSHtY3YWX5kU",
            key4: "AIzaSyCPAY_ukeGnAGJdCvYk1bVVDxZjQRJqsdk",
            key5: "AIzaSyBGcwaCm70o4ir0CKcNIJ0V_7TeyY2cwdA",
            custom: state.customApiKey,
          };

          setState((prev) => ({
            ...prev,
            selectedApiKeyOption: option,
            apiKey:
              option === "custom"
                ? prev.customApiKey
                : API_KEY_OPTIONS[option as keyof typeof API_KEY_OPTIONS] ||
                  prev.apiKey,
          }));
        }}
        customApiKey={state.customApiKey}
        onCustomApiKeyChange={(key) => {
          setState((prev) => ({
            ...prev,
            customApiKey: key,
            apiKey: prev.selectedApiKeyOption === "custom" ? key : prev.apiKey,
          }));
        }}
        autoRotateApiKeys={state.autoRotateApiKeys}
        onAutoRotateChange={(enabled) =>
          setState((prev) => ({ ...prev, autoRotateApiKeys: enabled }))
        }
        rotationHistory={state.rotationHistory}
        lastRotationTime={state.lastRotationTime}
        searchMethod={state.searchMethod}
        onSearchMethodChange={(searchMethod) =>
          setState((prev) => ({ ...prev, searchMethod }))
        }
        selectedCoinAcceptor={state.selectedCoinAcceptor}
        onCoinAcceptorChange={(device) =>
          setState((prev) => ({ ...prev, selectedCoinAcceptor: device }))
        }
        logs={state.logs}
        userRequests={state.userRequests}
        creditHistory={state.creditHistory}
        backgrounds={state.backgrounds}
        selectedBackground={state.selectedBackground}
        onBackgroundChange={(id) =>
          setState((prev) => ({ ...prev, selectedBackground: id }))
        }
        cycleBackgrounds={state.cycleBackgrounds}
        onCycleBackgroundsChange={(cycle) =>
          setState((prev) => ({ ...prev, cycleBackgrounds: cycle }))
        }
        bounceVideos={state.bounceVideos}
        onBounceVideosChange={(bounce) =>
          setState((prev) => ({ ...prev, bounceVideos: bounce }))
        }
        onBackgroundUpload={handleBackgroundUpload}
        onAddLog={addLog}
        onAddUserRequest={addUserRequest}
        onAddCreditHistory={addCreditHistory}
        playerWindow={state.playerWindow}
        isPlayerRunning={state.isPlayerRunning}
        onPlayerToggle={handlePlayerToggle}
        onSkipSong={handleSkipSong}
        onInitializePlayer={initializePlayer}
        maxSongLength={state.maxSongLength}
        onMaxSongLengthChange={(minutes) =>
          setState((prev) => ({ ...prev, maxSongLength: minutes }))
        }
        defaultPlaylist={state.defaultPlaylist}
        onDefaultPlaylistChange={handleDefaultPlaylistChange}
        currentPlaylistVideos={getCurrentPlaylistForDisplay()}
        onPlaylistReorder={handlePlaylistReorder}
        onPlaylistShuffle={handlePlaylistShuffle}
        currentlyPlaying={state.currentlyPlaying}
        priorityQueue={state.priorityQueue}
        showMiniPlayer={state.showMiniPlayer}
        onShowMiniPlayerChange={(show) =>
          setState((prev) => ({ ...prev, showMiniPlayer: show }))
        }
        testMode={state.testMode}
        onTestModeChange={(testMode) =>
          setState((prev) => ({ ...prev, testMode }))
        }
        coinValueA={state.coinValueA}
        onCoinValueAChange={(value) =>
          setState((prev) => ({ ...prev, coinValueA: value }))
        }
        coinValueB={state.coinValueB}
        onCoinValueBChange={(value) =>
          setState((prev) => ({ ...prev, coinValueB: value }))
        }
      />

      {/* Display Confirmation Dialog */}
      {pendingDisplayConfirmation && (
        <DisplayConfirmationDialog
          isOpen={true}
          displayInfo={pendingDisplayConfirmation.displayInfo}
          onConfirm={handleDisplayConfirmationResponse}
          onCancel={handleDisplayConfirmationCancel}
        />
      )}

      {/* API Key Test Dialog */}
      <ApiKeyTestDialog
        isOpen={state.showApiKeyTestDialog}
        onComplete={handleApiKeyTestComplete}
      />

      {/* Quota Exhausted Dialog */}
      <QuotaExhaustedDialog
        isOpen={state.allKeysExhausted}
        onOkClick={handleQuotaExhaustedOk}
      />

      {/* App Pause Overlay */}
      {state.isAppPaused && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-white text-center">
            <h2 className="text-4xl font-bold mb-4">APP PAUSED</h2>
            <p className="text-xl">
              All API keys exhausted. Please acknowledge the dialog to continue.
            </p>
          </div>
        </div>
      )}
    </BackgroundDisplay>
  );
};

export default Index;

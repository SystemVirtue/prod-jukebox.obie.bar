import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SearchInterface } from "@/components/SearchInterface";
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
import { DisplayInfo } from "@/services/displayManager";

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

  // Initialize playlist first, then player when playlist is ready and has songs
  useEffect(() => {
    console.log("Loading initial playlist...");
    loadPlaylistVideos(state.defaultPlaylist);
  }, []);

  // Initialize player only after playlist is loaded and ready
  useEffect(() => {
    console.log("[Auto-init] Checking player initialization conditions:", {
      playlistLength: state.defaultPlaylistVideos.length,
      hasPlayerWindow: !!state.playerWindow,
      isPlayerRunning: state.isPlayerRunning,
      windowClosed: state.playerWindow?.closed,
    });

    if (
      state.defaultPlaylistVideos.length > 0 &&
      (!state.playerWindow || state.playerWindow.closed) &&
      !state.isPlayerRunning
    ) {
      console.log(
        "[Auto-init] Playlist loaded with",
        state.defaultPlaylistVideos.length,
        "videos. Initializing player...",
      );

      // Add a small delay to ensure state is settled
      setTimeout(() => {
        console.log("[Auto-init] Executing player initialization");
        initializePlayer();
      }, 1000);
    } else {
      console.log("[Auto-init] Skipping initialization - conditions not met");
    }
  }, [
    state.defaultPlaylistVideos.length,
    state.playerWindow,
    state.isPlayerRunning,
    initializePlayer,
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
        playNextSong();
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

  const currentBackground = getCurrentBackground();

  // Determine when to show the loading indicator
  const isLoading =
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
        {/* Now Playing Ticker - Top Left - Reduced width by 20% (from 48rem to 38.4rem) */}
        <div className="absolute top-4 left-4 z-20">
          <Card className="bg-black/60 border-yellow-400 shadow-lg backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="text-amber-100 font-bold text-lg w-[30.7rem] truncate">
                Now Playing: {state.currentlyPlaying}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Credits display has been moved to the CreditsDisplay component */}

        <div className="text-center mb-8">
          {/* Main UI text has been hidden as requested */}

          {/* Mini Player - positioned between subtitle and search button */}
          {state.showMiniPlayer && state.currentVideoId && (
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-27 rounded-lg overflow-hidden shadow-2xl">
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

        {/* Absolutely positioned search button */}
        <div className="fixed bottom-[calc(2rem+50px)] left-0 right-0 flex justify-center z-20">
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
            className="w-96 h-24 text-3xl font-bold bg-black/60 text-white shadow-lg border-4 border-yellow-400 rounded-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden"
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

        {/* Coming Up Ticker - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-amber-200 py-2 overflow-hidden">
          <div
            className="whitespace-nowrap animate-marquee"
            key={`${state.currentlyPlaying}-${state.priorityQueue.length}-${state.inMemoryPlaylist.length}`}
          >
            <span className="text-lg font-bold">COMING UP: </span>
            {getUpcomingTitles().map((title, index) => (
              <span key={`${index}-${title}`} className="mx-8 text-lg">
                {index + 1}. {title}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-4 left-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState((prev) => ({ ...prev, isAdminOpen: true }))}
            className="text-amber-200 hover:text-amber-100 opacity-30 hover:opacity-100"
          >
            <Settings className="w-4 h-4" />
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

      <SearchInterface
        isOpen={state.isSearchOpen}
        onClose={() => {
          console.log("Search interface closing");
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
          console.log("Search query changed:", query);
          setState((prev) => ({ ...prev, searchQuery: query }));
        }}
        searchResults={state.searchResults}
        isSearching={state.isSearching}
        showKeyboard={state.showKeyboard}
        showSearchResults={state.showSearchResults}
        onKeyboardInput={handleKeyboardInput}
        onVideoSelect={handleVideoSelect}
        onBackToSearch={() => {
          console.log("Back to search pressed");
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
    </BackgroundDisplay>
  );
};

export default Index;

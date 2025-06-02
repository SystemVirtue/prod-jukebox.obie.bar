
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Settings } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useSerialCommunication } from "@/components/SerialCommunication";
import { useBackgroundManager, BackgroundDisplay } from "@/components/BackgroundManager";
import { useJukeboxState } from "@/hooks/useJukeboxState";
import { usePlayerManager } from "@/hooks/usePlayerManager";
import { usePlaylistManager } from "@/hooks/usePlaylistManager";
import { useVideoSearch } from "@/hooks/useVideoSearch";
import { useStorageEventHandler } from "@/hooks/useStorageEventHandler";
import { StatusDisplay } from "@/components/StatusDisplay";
import { MainSearchButton } from "@/components/MainSearchButton";
import { ComingUpTicker } from "@/components/ComingUpTicker";
import { MiniPlayerDisplay } from "@/components/MiniPlayerDisplay";
import { DialogsContainer } from "@/components/DialogsContainer";

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
    getCurrentPlaylistForDisplay
  } = useJukeboxState();

  const {
    initializePlayer,
    playSong,
    handlePlayerToggle,
    handleSkipSong,
    performSkip
  } = usePlayerManager(state, setState, addLog);

  const {
    loadPlaylistVideos,
    playNextSong,
    handleVideoEnded,
    handleDefaultPlaylistChange,
    handlePlaylistReorder,
    handlePlaylistShuffle
  } = usePlaylistManager(state, setState, addLog, playSong, toast);

  const {
    performSearch,
    filterForOfficial,
    handleVideoSelect,
    confirmAddToPlaylist,
    handleKeyboardInput,
    confirmDialog,
    setConfirmDialog
  } = useVideoSearch(state, setState, addLog, addUserRequest, addCreditHistory, toast);

  // Use storage event handler hook
  useStorageEventHandler({
    state,
    setState,
    handleVideoEnded,
    addLog
  });

  // Use background manager hook
  const { getCurrentBackground } = useBackgroundManager({
    backgrounds: state.backgrounds,
    selectedBackground: state.selectedBackground,
    cycleBackgrounds: state.cycleBackgrounds,
    backgroundCycleIndex: state.backgroundCycleIndex,
    bounceVideos: state.bounceVideos,
    onBackgroundCycleIndexChange: (index) => setState(prev => ({ ...prev, backgroundCycleIndex: index })),
    onSelectedBackgroundChange: (id) => setState(prev => ({ ...prev, selectedBackground: id }))
  });

  // Use serial communication hook
  useSerialCommunication({
    mode: state.mode,
    selectedCoinAcceptor: state.selectedCoinAcceptor,
    onCreditsChange: (credits) => setState(prev => ({ ...prev, credits })),
    credits: state.credits,
    onAddLog: addLog
  });

  // Initialize playlist first, then player when playlist is ready and has songs
  useEffect(() => {
    console.log('Loading initial playlist...');
    loadPlaylistVideos(state.defaultPlaylist);
  }, []);

  // Initialize player only after playlist is loaded and ready
  useEffect(() => {
    if (state.defaultPlaylistVideos.length > 0 && !state.playerWindow && !state.isPlayerRunning) {
      console.log('Playlist loaded with', state.defaultPlaylistVideos.length, 'videos. Initializing player...');
      initializePlayer();
    }
  }, [state.defaultPlaylistVideos.length, state.playerWindow, state.isPlayerRunning]);

  // Enhanced autoplay logic - only start when player is ready and playlist has songs
  useEffect(() => {
    if (state.inMemoryPlaylist.length > 0 && 
        state.priorityQueue.length === 0 && 
        state.isPlayerRunning && 
        !state.isPlayerPaused &&
        state.playerWindow &&
        !state.playerWindow.closed) {
      // Only auto-start if nothing is currently playing
      if (state.currentlyPlaying === 'Loading...' || state.currentlyPlaying === '') {
        console.log('Auto-starting first song from playlist...');
        playNextSong();
      }
    }
  }, [state.inMemoryPlaylist, state.priorityQueue, state.isPlayerRunning, state.isPlayerPaused, state.playerWindow]);

  const handleSearchClick = () => {
    console.log('Search button clicked - opening search interface');
    setState(prev => ({ ...prev, isSearchOpen: true, showKeyboard: true, showSearchResults: false }));
  };

  const handleSearchClose = () => {
    console.log('Search interface closing');
    setState(prev => ({ 
      ...prev, 
      isSearchOpen: false, 
      showKeyboard: false, 
      showSearchResults: false,
      searchQuery: '', 
      searchResults: [] 
    }));
  };

  const handleBackToSearch = () => {
    console.log('Back to search pressed');
    setState(prev => ({ ...prev, showSearchResults: false, showKeyboard: true }));
  };

  const currentBackground = getCurrentBackground();

  return (
    <BackgroundDisplay background={currentBackground} bounceVideos={state.bounceVideos}>
      <div className="relative z-10 min-h-screen p-8 flex flex-col">
        <StatusDisplay
          currentlyPlaying={state.currentlyPlaying}
          mode={state.mode}
          credits={state.credits}
        />

        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-amber-200 drop-shadow-2xl mb-4">
            MUSIC JUKEBOX
          </h1>
          <p className="text-2xl text-amber-100 drop-shadow-lg mb-8">
            Touch to Select Your Music
          </p>
          
          <MiniPlayerDisplay
            showMiniPlayer={state.showMiniPlayer}
            currentVideoId={state.currentVideoId}
          />
        </div>

        <MainSearchButton onSearchClick={handleSearchClick} />

        <ComingUpTicker upcomingTitles={getUpcomingTitles()} />

        <div className="absolute bottom-4 left-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState(prev => ({ ...prev, isAdminOpen: true }))}
            className="text-amber-200 hover:text-amber-100 opacity-30 hover:opacity-100"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <DialogsContainer
        showSkipConfirmation={state.showSkipConfirmation}
        onSkipConfirmationClose={() => setState(prev => ({ ...prev, showSkipConfirmation: false }))}
        onPerformSkip={performSkip}
        isSearchOpen={state.isSearchOpen}
        onSearchClose={handleSearchClose}
        searchQuery={state.searchQuery}
        onSearchQueryChange={(query) => setState(prev => ({ ...prev, searchQuery: query }))}
        searchResults={state.searchResults}
        isSearching={state.isSearching}
        showKeyboard={state.showKeyboard}
        showSearchResults={state.showSearchResults}
        onKeyboardInput={handleKeyboardInput}
        onVideoSelect={handleVideoSelect}
        onBackToSearch={handleBackToSearch}
        mode={state.mode}
        credits={state.credits}
        onInsufficientCredits={() => setState(prev => ({ ...prev, showInsufficientCredits: true }))}
        showInsufficientCredits={state.showInsufficientCredits}
        onInsufficientCreditsClose={() => setState(prev => ({ 
          ...prev, 
          showInsufficientCredits: false,
          isSearchOpen: false, 
          showKeyboard: false, 
          showSearchResults: false,
          searchQuery: '', 
          searchResults: [] 
        }))}
        showDuplicateSong={state.showDuplicateSong}
        onDuplicateSongClose={() => setState(prev => ({ ...prev, showDuplicateSong: false, duplicateSongTitle: '' }))}
        duplicateSongTitle={state.duplicateSongTitle}
        confirmDialog={confirmDialog}
        onConfirmDialogClose={() => setConfirmDialog({ isOpen: false, video: null })}
        onConfirmAddToPlaylist={confirmAddToPlaylist}
        isAdminOpen={state.isAdminOpen}
        onAdminClose={() => setState(prev => ({ ...prev, isAdminOpen: false }))}
        adminProps={{
          mode: state.mode,
          onModeChange: (mode) => setState(prev => ({ ...prev, mode })),
          credits: state.credits,
          onCreditsChange: (credits) => setState(prev => ({ ...prev, credits })),
          apiKey: state.apiKey,
          onApiKeyChange: (apiKey) => setState(prev => ({ ...prev, apiKey })),
          selectedCoinAcceptor: state.selectedCoinAcceptor,
          onCoinAcceptorChange: (device) => setState(prev => ({ ...prev, selectedCoinAcceptor: device })),
          logs: state.logs,
          userRequests: state.userRequests,
          creditHistory: state.creditHistory,
          backgrounds: state.backgrounds,
          selectedBackground: state.selectedBackground,
          onBackgroundChange: (id) => setState(prev => ({ ...prev, selectedBackground: id })),
          cycleBackgrounds: state.cycleBackgrounds,
          onCycleBackgroundsChange: (cycle) => setState(prev => ({ ...prev, cycleBackgrounds: cycle })),
          bounceVideos: state.bounceVideos,
          onBounceVideosChange: (bounce) => setState(prev => ({ ...prev, bounceVideos: bounce })),
          onBackgroundUpload: handleBackgroundUpload,
          onAddLog: addLog,
          onAddUserRequest: addUserRequest,
          onAddCreditHistory: addCreditHistory,
          playerWindow: state.playerWindow,
          isPlayerRunning: state.isPlayerRunning,
          onPlayerToggle: handlePlayerToggle,
          onSkipSong: handleSkipSong,
          maxSongLength: state.maxSongLength,
          onMaxSongLengthChange: (minutes) => setState(prev => ({ ...prev, maxSongLength: minutes })),
          defaultPlaylist: state.defaultPlaylist,
          onDefaultPlaylistChange: handleDefaultPlaylistChange,
          currentPlaylistVideos: getCurrentPlaylistForDisplay(),
          onPlaylistReorder: handlePlaylistReorder,
          onPlaylistShuffle: handlePlaylistShuffle,
          currentlyPlaying: state.currentlyPlaying,
          priorityQueue: state.priorityQueue,
          showMiniPlayer: state.showMiniPlayer,
          onShowMiniPlayerChange: (show) => setState(prev => ({ ...prev, showMiniPlayer: show }))
        }}
      />
    </BackgroundDisplay>
  );
};

export default Index;

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X } from 'lucide-react';
import { SearchInterface } from "@/components/SearchInterface";
import { InsufficientCreditsDialog } from "@/components/InsufficientCreditsDialog";
import { DuplicateSongDialog } from "@/components/DuplicateSongDialog";
import { AdminConsole } from "@/components/AdminConsole";
import { SearchResult } from "@/hooks/useJukeboxState";

interface DialogsContainerProps {
  // Skip confirmation dialog props
  showSkipConfirmation: boolean;
  onSkipConfirmationClose: () => void;
  onPerformSkip: () => void;

  // Search interface props
  isSearchOpen: boolean;
  onSearchClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  showKeyboard: boolean;
  showSearchResults: boolean;
  onKeyboardInput: (key: string) => void;
  onVideoSelect: (video: SearchResult) => void;
  onBackToSearch: () => void;
  mode: 'FREEPLAY' | 'PAID';
  credits: number;
  onInsufficientCredits: () => void;

  // Other dialogs
  showInsufficientCredits: boolean;
  onInsufficientCreditsClose: () => void;
  showDuplicateSong: boolean;
  onDuplicateSongClose: () => void;
  duplicateSongTitle: string;

  // Confirmation dialog
  confirmDialog: { isOpen: boolean; video: SearchResult | null };
  onConfirmDialogClose: () => void;
  onConfirmAddToPlaylist: () => void;

  // Admin console props
  isAdminOpen: boolean;
  onAdminClose: () => void;
  adminProps: any; // We'll pass all admin props as a single object
}

export const DialogsContainer: React.FC<DialogsContainerProps> = ({
  showSkipConfirmation,
  onSkipConfirmationClose,
  onPerformSkip,
  isSearchOpen,
  onSearchClose,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isSearching,
  showKeyboard,
  showSearchResults,
  onKeyboardInput,
  onVideoSelect,
  onBackToSearch,
  mode,
  credits,
  onInsufficientCredits,
  showInsufficientCredits,
  onInsufficientCreditsClose,
  showDuplicateSong,
  onDuplicateSongClose,
  duplicateSongTitle,
  confirmDialog,
  onConfirmDialogClose,
  onConfirmAddToPlaylist,
  isAdminOpen,
  onAdminClose,
  adminProps
}) => {
  return (
    <>
      {/* Skip Confirmation Dialog */}
      <Dialog open={showSkipConfirmation} onOpenChange={(open) => !open && onSkipConfirmationClose()}>
        <DialogContent className="bg-gradient-to-b from-amber-50 to-amber-100 border-amber-600">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-900">Skip User Selection?</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-amber-800">
              Current song is a user selection. Are you sure you want to skip to the next song?
            </p>
          </div>
          
          <DialogFooter className="flex gap-4">
            <Button
              variant="outline"
              onClick={onSkipConfirmationClose}
              className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              No
            </Button>
            <Button
              onClick={onPerformSkip}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Yes, Skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SearchInterface
        isOpen={isSearchOpen}
        onClose={onSearchClose}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        searchResults={searchResults}
        isSearching={isSearching}
        showKeyboard={showKeyboard}
        showSearchResults={showSearchResults}
        onKeyboardInput={onKeyboardInput}
        onVideoSelect={onVideoSelect}
        onBackToSearch={onBackToSearch}
        mode={mode}
        credits={credits}
        onInsufficientCredits={onInsufficientCredits}
      />

      <InsufficientCreditsDialog
        isOpen={showInsufficientCredits}
        onClose={onInsufficientCreditsClose}
      />

      <DuplicateSongDialog
        isOpen={showDuplicateSong}
        onClose={onDuplicateSongClose}
        songTitle={duplicateSongTitle}
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && onConfirmDialogClose()}>
        <DialogContent className="bg-gradient-to-b from-amber-50 to-amber-100 border-amber-600">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-900">Add song to Playlist?</DialogTitle>
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
                  <h3 className="font-semibold text-amber-900">{confirmDialog.video.title}</h3>
                  <p className="text-amber-700">{confirmDialog.video.channelTitle}</p>
                  {confirmDialog.video.duration && (
                    <p className="text-amber-600 text-sm">{confirmDialog.video.duration}</p>
                  )}
                  {mode === 'PAID' && (
                    <p className="text-sm text-amber-600 mt-1">Cost: 1 Credit</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-4">
            <Button
              variant="outline"
              onClick={onConfirmDialogClose}
              className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              No
            </Button>
            <Button
              onClick={onConfirmAddToPlaylist}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConsole
        isOpen={isAdminOpen}
        onClose={onAdminClose}
        {...adminProps}
      />
    </>
  );
};

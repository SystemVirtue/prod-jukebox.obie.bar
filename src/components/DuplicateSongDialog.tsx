import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DuplicateSongDialogProps {
  isOpen: boolean;
  onClose: () => void;
  songTitle: string;
}

export const DuplicateSongDialog: React.FC<DuplicateSongDialogProps> = ({
  isOpen,
  onClose,
  songTitle,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-b from-red-50 to-red-100 border-red-600 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-red-900 text-center">
            Duplicate Song
          </DialogTitle>
          <DialogDescription className="text-red-800 text-center">
            This song is already in the queue. Please select a different song.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 text-center">
          <p className="text-red-800 text-lg mb-2">
            "{songTitle}" is already in the queue.
          </p>
          <p className="text-red-700">Please select a different song.</p>
        </div>

        <DialogFooter className="flex justify-center">
          <Button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

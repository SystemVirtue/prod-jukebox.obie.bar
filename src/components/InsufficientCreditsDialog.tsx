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

interface InsufficientCreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InsufficientCreditsDialog: React.FC<
  InsufficientCreditsDialogProps
> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-b from-amber-50 to-amber-100 border-amber-600 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-amber-900 text-center">
            Insufficient Credits
          </DialogTitle>
          <DialogDescription className="text-amber-800 text-center">
            You need credits to request songs. Please insert a coin to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 text-center">
          <p className="text-amber-800 text-lg">
            Please insert a coin to add song requests
          </p>
        </div>

        <DialogFooter className="flex justify-center">
          <Button
            onClick={onClose}
            className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 text-lg"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

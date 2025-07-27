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
import { AlertTriangle } from "lucide-react";

interface QuotaExhaustedDialogProps {
  isOpen: boolean;
  onOkClick: () => void;
}

export const QuotaExhaustedDialog: React.FC<QuotaExhaustedDialogProps> = ({
  isOpen,
  onOkClick,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="bg-gradient-to-b from-red-50 to-red-100 border-red-600 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            All API Keys Exhausted
          </DialogTitle>
          <DialogDescription className="text-red-800">
            All available YouTube API keys have exceeded their quota limits.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center p-6 bg-red-200 rounded-lg border border-red-300">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="font-bold text-red-900 text-lg mb-2">
              QUOTA EXCEEDED ON ALL AVAILABLE API KEYS
            </h3>
            <p className="text-red-800 text-sm">
              All YouTube API keys have been tested and have reached their daily
              quota limits. The application is paused until you acknowledge this
              message.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-center">
          <Button
            onClick={onOkClick}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 text-lg"
            size="lg"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
import { Checkbox } from "@/components/ui/checkbox";
import { Monitor, MonitorSpeaker } from "lucide-react";
import { DisplayInfo } from "@/services/displayManager";

interface DisplayConfirmationDialogProps {
  isOpen: boolean;
  displayInfo: DisplayInfo;
  onConfirm: (useFullscreen: boolean, rememberChoice: boolean) => void;
  onCancel: () => void;
}

export const DisplayConfirmationDialog: React.FC<
  DisplayConfirmationDialogProps
> = ({ isOpen, displayInfo, onConfirm, onCancel }) => {
  const [rememberChoice, setRememberChoice] = React.useState(false);

  const handleFullscreenConfirm = () => {
    onConfirm(true, rememberChoice);
  };

  const handleWindowedConfirm = () => {
    onConfirm(false, rememberChoice);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MonitorSpeaker className="w-6 h-6 text-blue-600" />
            External Display Detected
          </DialogTitle>
          <DialogDescription>
            Choose how to display the video player on your external monitor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Monitor className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-medium text-gray-900">{displayInfo.name}</h3>
              <p className="text-sm text-gray-600">
                {displayInfo.width} × {displayInfo.height} pixels
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700">
            Would you like to display the video player on your external display?
          </p>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberChoice}
              onCheckedChange={(checked) => setRememberChoice(checked === true)}
            />
            <label htmlFor="remember" className="text-sm text-gray-600">
              Remember my choice for future sessions
            </label>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleFullscreenConfirm}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            <MonitorSpeaker className="w-4 h-4 mr-2" />
            Yes, Fullscreen
          </Button>

          <Button
            onClick={handleWindowedConfirm}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Yes, Windowed
          </Button>

          <Button
            onClick={onCancel}
            variant="ghost"
            className="w-full sm:w-auto"
          >
            No, Use Main Screen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

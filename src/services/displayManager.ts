interface DisplayInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  left: number;
  top: number;
  isPrimary: boolean;
  isInternal: boolean;
}

interface DisplayPreference {
  preferExternal: boolean;
  fullscreen: boolean;
  rememberedChoice: boolean;
  lastUsedDisplay?: string;
}

/**
 * DisplayManager - Handles external display detection and window positioning
 *
 * Features:
 * - Automatic detection of external displays using modern Screen API
 * - User preference management for display selection
 * - Fullscreen mode support with fallback options
 * - Browser compatibility with graceful degradation
 *
 * Usage:
 * 1. Call getRecommendedDisplayConfig() to get optimal display setup
 * 2. Use getBestExternalDisplay() to check for external monitors
 * 3. Generate window features with generateWindowFeatures()
 * 4. Save user preferences with saveDisplayPreference()
 */
class DisplayManager {
  private cachedDisplays: DisplayInfo[] = [];
  private lastDetectionTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  // Check if the browser supports multi-screen API
  isMultiScreenSupported(): boolean {
    return (
      "getScreens" in window && typeof (window as any).getScreens === "function"
    );
  }

  // Detect available displays
  async detectDisplays(): Promise<DisplayInfo[]> {
    try {
      if (!this.isMultiScreenSupported()) {
        // Fallback to single screen detection
        return [
          {
            id: "primary",
            name: "Primary Display",
            width: window.screen.width,
            height: window.screen.height,
            left: 0,
            top: 0,
            isPrimary: true,
            isInternal: true,
          },
        ];
      }

      // Use modern Screen API if available
      const screens = await (window as any).getScreens();

      const displays: DisplayInfo[] = screens.map(
        (screen: any, index: number) => ({
          id: `display-${index}`,
          name: screen.label || `Display ${index + 1}`,
          width: screen.width,
          height: screen.height,
          left: screen.left,
          top: screen.top,
          isPrimary: screen.isPrimary || false,
          isInternal: screen.isInternal || false,
        }),
      );

      this.cachedDisplays = displays;
      this.lastDetectionTime = Date.now();

      return displays;
    } catch (error) {
      console.error("Error detecting displays:", error);
      // Fallback to current screen
      return [
        {
          id: "primary",
          name: "Primary Display",
          width: window.screen.width,
          height: window.screen.height,
          left: 0,
          top: 0,
          isPrimary: true,
          isInternal: true,
        },
      ];
    }
  }

  // Get cached displays if recent, otherwise detect
  async getDisplays(): Promise<DisplayInfo[]> {
    const now = Date.now();
    if (
      this.cachedDisplays.length > 0 &&
      now - this.lastDetectionTime < this.CACHE_DURATION
    ) {
      return this.cachedDisplays;
    }
    return this.detectDisplays();
  }

  // Find the best external display for video
  async getBestExternalDisplay(): Promise<DisplayInfo | null> {
    const displays = await this.getDisplays();

    // Find the largest external display
    const externalDisplays = displays.filter(
      (d) => !d.isPrimary && !d.isInternal,
    );

    if (externalDisplays.length === 0) {
      return null;
    }

    // Sort by screen area (width * height) - largest first
    externalDisplays.sort((a, b) => b.width * b.height - a.width * a.height);

    return externalDisplays[0];
  }

  // Generate window features string for opening popup
  generateWindowFeatures(
    display: DisplayInfo,
    fullscreen: boolean = false,
  ): string {
    if (fullscreen) {
      return `width=${display.width},height=${display.height},left=${display.left},top=${display.top},scrollbars=no,menubar=no,toolbar=no,location=no,status=no,resizable=no`;
    } else {
      // Use 80% of display size for windowed mode
      const width = Math.floor(display.width * 0.8);
      const height = Math.floor(display.height * 0.8);
      const left = display.left + Math.floor((display.width - width) / 2);
      const top = display.top + Math.floor((display.height - height) / 2);

      return `width=${width},height=${height},left=${left},top=${top},scrollbars=no,menubar=no,toolbar=no,location=no,status=no,resizable=yes`;
    }
  }

  // Check if user has permission for the Screen API
  async requestScreenPermission(): Promise<boolean> {
    try {
      if (!this.isMultiScreenSupported()) {
        return true; // No permission needed for single screen
      }

      // Some browsers require permission for getScreens()
      const screens = await (window as any).getScreens();
      return screens.length > 0;
    } catch (error) {
      console.warn(
        "Screen permission not granted or API not available:",
        error,
      );
      return false;
    }
  }

  // Get display preference from localStorage
  getDisplayPreference(): DisplayPreference {
    try {
      const stored = localStorage.getItem("displayPreference");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error reading display preference:", error);
    }

    // Default preference
    return {
      preferExternal: true,
      fullscreen: true,
      rememberedChoice: false,
    };
  }

  // Save display preference to localStorage
  saveDisplayPreference(preference: DisplayPreference): void {
    try {
      localStorage.setItem("displayPreference", JSON.stringify(preference));
    } catch (error) {
      console.error("Error saving display preference:", error);
    }
  }

  // Get the recommended display configuration
  async getRecommendedDisplayConfig(): Promise<{
    display: DisplayInfo;
    useFullscreen: boolean;
    requiresPermission: boolean;
  }> {
    const displays = await this.getDisplays();
    const preference = this.getDisplayPreference();
    const externalDisplay = await this.getBestExternalDisplay();

    // If external display available and preferred
    if (externalDisplay && preference.preferExternal) {
      return {
        display: externalDisplay,
        useFullscreen: preference.fullscreen,
        requiresPermission: true,
      };
    }

    // Fall back to primary display
    const primaryDisplay = displays.find((d) => d.isPrimary) || displays[0];
    return {
      display: primaryDisplay,
      useFullscreen: false,
      requiresPermission: false,
    };
  }
}

export const displayManager = new DisplayManager();
export type { DisplayInfo, DisplayPreference };

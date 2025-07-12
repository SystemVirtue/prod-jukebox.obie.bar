import { youtubeHtmlParserService } from "@/services/youtubeHtmlParser";
import { PlaylistItem } from "@/hooks/useJukeboxState";

/**
 * Emergency fallback function that can be called from browser console
 * to recover from a hanging app state when all API keys fail
 */
export const emergencyRecovery = {
  /**
   * Force load a fallback playlist to recover from hanging state
   */
  async forceLoadFallbackPlaylist(): Promise<PlaylistItem[]> {
    console.log(
      "[EmergencyRecovery] Starting forced fallback playlist load...",
    );
    try {
      // All fallback data is now provided by the backend proxy
      const playlist = await youtubeHtmlParserService.parsePlaylist("emergency");
      if (!playlist || playlist.length === 0) {
        throw new Error("No fallback playlist available from backend proxy.");
      }
      localStorage.setItem("emergency-playlist", JSON.stringify(playlist));
      console.log(
        `[EmergencyRecovery] Fallback playlist loaded from backend proxy and stored in localStorage. Run emergencyRecovery.injectPlaylist() to inject.`
      );
      return playlist;
    } catch (error) {
      console.error(
        "[EmergencyRecovery] Failed to load fallback playlist from backend proxy:",
        error
      );
      throw error;
    }
  },

  /**
   * Inject the emergency playlist into the app state
   */
  injectPlaylist(): void {
    console.log(
      "[EmergencyRecovery] Attempting to inject emergency playlist...",
    );

    const stored = localStorage.getItem("emergency-playlist");
    if (!stored) {
      console.error(
        "[EmergencyRecovery] No emergency playlist found. Run emergencyRecovery.forceLoadFallbackPlaylist() first",
      );
      return;
    }

    try {
      const playlist = JSON.parse(stored);

      // Dispatch a custom event that the app can listen for
      const event = new CustomEvent("emergency-playlist-inject", {
        detail: { playlist },
      });

      window.dispatchEvent(event);
      console.log(
        `[EmergencyRecovery] Injected ${playlist.length} songs via custom event`,
      );
      console.log("If the app doesn't respond, try refreshing the page");
    } catch (error) {
      console.error("[EmergencyRecovery] Failed to inject playlist:", error);
    }
  },

  /**
   * Clear all quota exhaustion flags to force API retry
   */
  clearQuotaFlags(): void {
    console.log("[EmergencyRecovery] Clearing all quota exhaustion flags...");

    const keys = Object.keys(localStorage);
    let cleared = 0;

    keys.forEach((key) => {
      if (
        key.startsWith("quota-exhausted-") ||
        key.startsWith("playlist-fetch-failures-")
      ) {
        localStorage.removeItem(key);
        cleared++;
      }
    });

    console.log(`[EmergencyRecovery] Cleared ${cleared} quota/failure flags`);
    console.log(
      "API calls will now be retried. Refresh the page to apply changes.",
    );
  },

  /**
   * Get current app state information for debugging
   */
  getDebugInfo(): object {
    const info = {
      localStorage: {
        quotaFlags: Object.keys(localStorage).filter((k) =>
          k.startsWith("quota-exhausted-"),
        ),
        failureFlags: Object.keys(localStorage).filter((k) =>
          k.startsWith("playlist-fetch-failures-"),
        ),
        hasEmergencyPlaylist: !!localStorage.getItem("emergency-playlist"),
      },
      navigator: {
        onLine: navigator.onLine,
        userAgent: navigator.userAgent,
      },
      windowVars: {
        hasJukeboxStatus: !!localStorage.getItem("jukeboxStatus"),
        hasJukeboxCommand: !!localStorage.getItem("jukeboxCommand"),
      },
    };

    console.log("[EmergencyRecovery] Debug information:", info);
    return info;
  },

  /**
   * Show available recovery commands
   */
  help(): void {
    console.log(`
🚨 EMERGENCY RECOVERY COMMANDS 🚨

Available methods:
- emergencyRecovery.forceLoadFallbackPlaylist() - Generate a fallback playlist
- emergencyRecovery.injectPlaylist() - Inject stored playlist into app
- emergencyRecovery.clearQuotaFlags() - Clear quota exhaustion flags
- emergencyRecovery.getDebugInfo() - Show debugging information
- emergencyRecovery.help() - Show this help

TYPICAL RECOVERY PROCEDURE:
1. emergencyRecovery.forceLoadFallbackPlaylist()
2. emergencyRecovery.injectPlaylist()
3. If still not working: emergencyRecovery.clearQuotaFlags() then refresh page

These functions are available in the browser console when the app is running.
    `);
  },
};

// Make it available globally for console access
(window as any).emergencyRecovery = emergencyRecovery;

console.log(
  "🚨 Emergency recovery tools loaded. Type 'emergencyRecovery.help()' in console for assistance.",
);

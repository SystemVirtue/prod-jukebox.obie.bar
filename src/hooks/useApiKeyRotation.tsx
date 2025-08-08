import { useEffect, useCallback } from "react";
import { JukeboxState } from "./useJukeboxState";
import { youtubeQuotaService } from "@/services/youtubeQuota";

export const useApiKeyRotation = (
  state: JukeboxState,
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>,
  toast: any,
) => {
  const API_KEY_OPTIONS = {
    key1: "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4",
    key2: "AIzaSyDQ_Jx4Dwje2snQisj7hEFVK9lJJ0tptcc",
    key3: "AIzaSyDy6_QI9SP5nOZRVoNa5xghSHtY3YWX5kU",
    key4: "AIzaSyCPAY_ukeGnAGJdCvYk1bVVDxZjQRJqsdk",
    key5: "AIzaSyD7iB_2dHUu9yS87WD4wMbkJQduibU5vco",
    key6: "AIzaSyCgtXTfFuUiiBsNXH6z_k9-GiCqiS0Cgso",
    key7: "AIzaSyCKHHGkaztp8tfs2BVxiny0InE_z-kGDtY",
    key8: "AIzaSyBGcwaCm70o4ir0CKcNIJ0V_7TeyY2cwdA",
  };

  const getAvailableKeys = useCallback(() => {
    const keys = Object.values(API_KEY_OPTIONS);
    if (state.customApiKey && state.selectedApiKeyOption === "custom") {
      keys.push(state.customApiKey);
    }
    return keys.filter((key) => key.length > 0);
  }, [state.customApiKey, state.selectedApiKeyOption]);

  const getOptionFromKey = useCallback(
    (apiKey: string): string => {
      for (const [option, key] of Object.entries(API_KEY_OPTIONS)) {
        if (key === apiKey) return option;
      }
      return state.customApiKey === apiKey ? "custom" : "key1";
    },
    [state.customApiKey],
  );

  const rotateToNextKey = useCallback(
    (exhaustedKey: string, nextKey: string) => {
      if (!state.autoRotateApiKeys) {
        console.log("Auto-rotation is disabled, skipping rotation");
        return;
      }

      const rotationEntry = {
        timestamp: new Date().toISOString(),
        from: exhaustedKey.slice(-8),
        to: nextKey.slice(-8),
        reason: "Quota exhausted",
      };

      setState((prev) => ({
        ...prev,
        apiKey: nextKey,
        selectedApiKeyOption: getOptionFromKey(nextKey),
        lastRotationTime: new Date().toISOString(),
        rotationHistory: [rotationEntry, ...prev.rotationHistory.slice(0, 9)], // Keep last 10 rotations
      }));

      toast({
        title: "API Key Rotated",
        description: `Switched from key ending in ${exhaustedKey.slice(-8)} to ${nextKey.slice(-8)} due to quota exhaustion.`,
        variant: "default",
      });

      console.log(
        `API Key auto-rotated: ${exhaustedKey.slice(-8)} → ${nextKey.slice(-8)}`,
      );
    },
    [state.autoRotateApiKeys, setState, getOptionFromKey, toast],
  );

  // Initialize quota service callback
  useEffect(() => {
    youtubeQuotaService.setQuotaExhaustedCallback(rotateToNextKey);

    return () => {
      youtubeQuotaService.setQuotaExhaustedCallback(null);
    };
  }, [rotateToNextKey]);

  // Enhanced API usage tracking with rotation
  const trackApiUsageWithRotation = useCallback(
    async (
      operation: "search" | "playlistItems" | "videos" | "playlists",
      count: number = 1,
    ) => {
      if (!state.autoRotateApiKeys) {
        youtubeQuotaService.trackApiUsage(state.apiKey, operation, count);
        return state.apiKey;
      }

      const availableKeys = getAvailableKeys();
      const newKey = await youtubeQuotaService.trackApiUsageWithRotation(
        state.apiKey,
        operation,
        count,
        availableKeys,
      );

      // If key changed, update state
      if (newKey !== state.apiKey) {
        setState((prev) => ({
          ...prev,
          apiKey: newKey,
          selectedApiKeyOption: getOptionFromKey(newKey),
          lastRotationTime: new Date().toISOString(),
        }));
      }

      return newKey;
    },
    [
      state.apiKey,
      state.autoRotateApiKeys,
      getAvailableKeys,
      setState,
      getOptionFromKey,
    ],
  );

  // Manual rotation check
  const checkAndRotateIfNeeded = useCallback(async () => {
    if (!state.autoRotateApiKeys) return;

    // Don't attempt rotation with empty or invalid API key
    if (!state.apiKey || state.apiKey.length < 20) {
      console.log("[API Rotation] Skipping rotation - no valid API key set");
      return;
    }

    const availableKeys = getAvailableKeys();
    if (availableKeys.length <= 1) return;

    try {
      const rotatedKey = await youtubeQuotaService.checkAndRotateKey(
        state.apiKey,
        availableKeys,
      );

      if (rotatedKey && rotatedKey !== state.apiKey) {
        setState((prev) => ({
          ...prev,
          apiKey: rotatedKey,
          selectedApiKeyOption: getOptionFromKey(rotatedKey),
          lastRotationTime: new Date().toISOString(),
        }));

        toast({
          title: "API Key Auto-Rotated",
          description: `Switched to key ending in ${rotatedKey.slice(-8)} due to quota threshold.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error during manual rotation check:", error);
      toast({
        title: "Rotation Error",
        description: "Failed to rotate API keys. All keys may be exhausted.",
        variant: "destructive",
      });
    }
  }, [
    state.autoRotateApiKeys,
    state.apiKey,
    getAvailableKeys,
    setState,
    getOptionFromKey,
    toast,
  ]);

  // Get all keys status for admin display
  const getAllKeysStatus = useCallback(async () => {
    const availableKeys = getAvailableKeys();
    return await youtubeQuotaService.getAllKeysQuotaStatus(availableKeys);
  }, [getAvailableKeys]);

  return {
    trackApiUsageWithRotation,
    checkAndRotateIfNeeded,
    getAllKeysStatus,
    rotateToNextKey,
    getAvailableKeys,
  };
};

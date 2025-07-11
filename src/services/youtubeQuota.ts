import { circuitBreaker } from "./circuitBreaker";

interface QuotaUsage {
  used: number;
  limit: number;
  percentage: number;
  lastUpdated: string;
}

interface QuotaCache {
  [apiKey: string]: QuotaUsage;
}

class YouTubeQuotaService {
  private quotaCache: QuotaCache = {};
  private readonly QUOTA_LIMIT = 10000; // YouTube Data API v3 daily quota limit
  private onQuotaExhaustedCallback:
    | ((exhaustedKey: string, nextKey: string) => void)
    | null = null;
  private onAllKeysExhaustedCallback: (() => void) | null = null;
  private lastCheckTimes: { [key: string]: number } = {};
  private readonly MIN_CHECK_INTERVAL = 2000; // Minimum 2 seconds between checks for same key

  // Estimate quota costs for different operations
  private readonly QUOTA_COSTS = {
    search: 100,
    playlistItems: 1,
    videos: 1,
    playlists: 1,
    channels: 1,
  };

  async checkQuotaUsage(apiKey: string): Promise<QuotaUsage> {
    try {
      // Check if API key is properly formatted before making request
      if (!apiKey || !apiKey.startsWith("AIza") || apiKey.length < 20) {
        console.warn(
          `[QuotaService] Invalid API key format: '${apiKey}' - returning default quota`,
        );
        // Return a safe default instead of throwing
        return {
          used: 0,
          limit: this.QUOTA_LIMIT,
          percentage: 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      // Rate limiting: prevent rapid successive calls for the same key
      const keyId = apiKey.slice(-8);
      const now = Date.now();
      const lastCheck = this.lastCheckTimes[keyId] || 0;

      if (now - lastCheck < this.MIN_CHECK_INTERVAL) {
        console.log(
          `[QuotaService] Rate limited quota check for key ...${keyId}`,
        );
        // Return cached result if available
        const cached = this.quotaCache[apiKey];
        if (cached) {
          return cached;
        }
        // If no cached result, create a default one
        return {
          used: 0,
          limit: this.QUOTA_LIMIT,
          percentage: 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      this.lastCheckTimes[keyId] = now;

      // Circuit breaker check
      const endpoint = `quota-check-${keyId}`;
      if (!circuitBreaker.canMakeCall(endpoint)) {
        throw new Error("Circuit breaker activated - too many quota checks");
      }

      circuitBreaker.recordCall(endpoint);

      // Try a minimal API call to check if key is valid and estimate usage
      // Use a more specific search query and ensure proper encoding
      const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent("music")}&type=video&maxResults=1&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(testUrl);

      // Read response body once and handle all cases
      let responseData = null;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        // Response is not JSON, handle based on status code only
        if (!response.ok) {
          if (response.status === 403) {
            // Assume quota exceeded for 403 without readable JSON
            return {
              used: this.QUOTA_LIMIT,
              limit: this.QUOTA_LIMIT,
              percentage: 100,
              lastUpdated: new Date().toISOString(),
            };
          } else {
            throw new Error(`API Error: ${response.status}`);
          }
        }
        // Success with non-JSON response, continue with estimation
      }

      // Handle error responses with parsed JSON data
      if (!response.ok) {
        if (response.status === 403) {
          // Check if we have quota exceeded in parsed data
          if (responseData?.error?.errors?.[0]?.reason === "quotaExceeded") {
            return {
              used: this.QUOTA_LIMIT,
              limit: this.QUOTA_LIMIT,
              percentage: 100,
              lastUpdated: new Date().toISOString(),
            };
          }
          // For other 403 errors, assume quota exceeded
          return {
            used: this.QUOTA_LIMIT,
            limit: this.QUOTA_LIMIT,
            percentage: 100,
            lastUpdated: new Date().toISOString(),
          };
        } else {
          // For non-403 errors, throw with available error info
          const errorMessage =
            responseData?.error?.message || `HTTP ${response.status}`;
          throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }
      }

      // Success case - response body already consumed above

      // If we get here, the API key is valid and has quota available
      // Return cached usage or estimate
      const cached = this.quotaCache[apiKey];
      if (cached && this.isRecentlyUpdated(cached.lastUpdated)) {
        return cached;
      }

      // Estimate usage based on recent activity (simplified approach)
      const estimatedUsage = this.estimateUsageFromCache(apiKey);

      const quotaUsage: QuotaUsage = {
        used: estimatedUsage,
        limit: this.QUOTA_LIMIT,
        percentage: (estimatedUsage / this.QUOTA_LIMIT) * 100,
        lastUpdated: new Date().toISOString(),
      };

      this.quotaCache[apiKey] = quotaUsage;
      return quotaUsage;
    } catch (error) {
      console.error("Error checking quota usage:", error);

      // Return cached data if available, otherwise return unknown status
      const cached = this.quotaCache[apiKey];
      if (cached) {
        return cached;
      }

      return {
        used: 0,
        limit: this.QUOTA_LIMIT,
        percentage: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  trackApiUsage(
    apiKey: string,
    operation: keyof typeof this.QUOTA_COSTS,
    count: number = 1,
  ) {
    const cost = this.QUOTA_COSTS[operation] * count;
    const current = this.quotaCache[apiKey] || {
      used: 0,
      limit: this.QUOTA_LIMIT,
      percentage: 0,
      lastUpdated: new Date().toISOString(),
    };

    current.used += cost;
    current.percentage = (current.used / current.limit) * 100;
    current.lastUpdated = new Date().toISOString();

    this.quotaCache[apiKey] = current;
  }

  private isRecentlyUpdated(lastUpdated: string): boolean {
    const updateTime = new Date(lastUpdated);
    const now = new Date();
    const diffMinutes = (now.getTime() - updateTime.getTime()) / (1000 * 60);
    return diffMinutes < 5; // Consider recent if updated within 5 minutes
  }

  private estimateUsageFromCache(apiKey: string): number {
    // Simple estimation - in a real app you'd track actual usage
    const cached = this.quotaCache[apiKey];
    return cached ? cached.used : 0;
  }

  resetDailyQuota(apiKey: string) {
    if (this.quotaCache[apiKey]) {
      this.quotaCache[apiKey] = {
        used: 0,
        limit: this.QUOTA_LIMIT,
        percentage: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  getAllQuotaStatus(): QuotaCache {
    return { ...this.quotaCache };
  }

  // Set callback for when quota is exhausted
  setQuotaExhaustedCallback(
    callback: (exhaustedKey: string, nextKey: string) => void,
  ) {
    this.onQuotaExhaustedCallback = callback;
  }

  // Set callback for when ALL keys are exhausted
  setAllKeysExhaustedCallback(callback: () => void) {
    this.onAllKeysExhaustedCallback = callback;
  }

  // Check if a key is exhausted (90% threshold to be safe)
  isKeyExhausted(apiKey: string): boolean {
    const usage = this.quotaCache[apiKey];
    return usage ? usage.percentage >= 90 : false;
  }

  // Get the next available API key by testing ALL keys sequentially
  async getNextAvailableKey(
    currentKey: string,
    availableKeys: string[],
  ): Promise<string | null> {
    console.log(
      `[API Rotation] Testing ALL ${availableKeys.length} keys sequentially...`,
    );

    // Test ALL keys sequentially, starting from key1 (primary)
    const orderedKeys = [
      "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4", // key1 - Primary
      "AIzaSyCKHHGkaztp8tfs2BVxiny0InE_z-kGDtY", // key2
      "AIzaSyDy6_QI9SP5nOZRVoNa5xghSHtY3YWX5kU", // key3
      "AIzaSyCPAY_ukeGnAGJdCvYk1bVVDxZjQRJqsdk", // key4
      "AIzaSyBGcwaCm70o4ir0CKcNIJ0V_7TeyY2cwdA", // key5
    ];

    // Add custom key if it exists and is different from predefined ones
    const customKey = availableKeys.find((key) => !orderedKeys.includes(key));
    if (customKey) {
      orderedKeys.push(customKey);
    }

    // Test each key sequentially
    for (const testKey of orderedKeys) {
      if (availableKeys.includes(testKey) && testKey !== currentKey) {
        console.log(
          `[API Rotation] Testing key ending in ...${testKey.slice(-8)}`,
        );

        try {
          // Test the key by checking quota
          await this.checkQuotaUsage(testKey);

          // If quota check succeeds and key is not exhausted, use it
          if (!this.isKeyExhausted(testKey)) {
            console.log(
              `[API Rotation] Found available key: ...${testKey.slice(-8)}`,
            );
            return testKey;
          } else {
            console.log(
              `[API Rotation] Key ...${testKey.slice(-8)} is quota exhausted`,
            );
          }
        } catch (error) {
          console.log(
            `[API Rotation] Key ...${testKey.slice(-8)} failed test:`,
            error.message,
          );
          // Mark this key as exhausted if it fails
          this.trackApiUsage(testKey, "search", 10000); // Mark as exhausted
        }
      }
    }

    console.log(`[API Rotation] ALL keys have been tested - none available`);

    // Trigger all keys exhausted callback
    if (this.onAllKeysExhaustedCallback) {
      this.onAllKeysExhaustedCallback();
    }

    return null; // All keys are exhausted
  }

  // Check and trigger rotation if current key is exhausted
  async checkAndRotateKey(
    currentKey: string,
    availableKeys: string[],
  ): Promise<string | null> {
    try {
      // Validate current key before proceeding
      if (
        !currentKey ||
        !currentKey.startsWith("AIza") ||
        currentKey.length < 20
      ) {
        console.warn(
          `[QuotaService] Invalid current key for rotation: '${currentKey}' - returning as-is`,
        );
        return currentKey;
      }

      // First check current quota status
      await this.checkQuotaUsage(currentKey);

      if (this.isKeyExhausted(currentKey)) {
        const nextKey = await this.getNextAvailableKey(
          currentKey,
          availableKeys,
        );

        if (nextKey && this.onQuotaExhaustedCallback) {
          console.warn(
            `API Key quota exhausted: ${currentKey.slice(-8)}. Rotating to: ${nextKey.slice(-8)}`,
          );
          this.onQuotaExhaustedCallback(currentKey, nextKey);
          return nextKey;
        } else if (!nextKey) {
          console.error("All API keys have exhausted their quota!");
          throw new Error("All API keys have reached their quota limit");
        }
      }

      return currentKey; // No rotation needed
    } catch (error) {
      console.error("Error during key rotation check:", error);
      return currentKey;
    }
  }

  // Enhanced tracking that triggers rotation if needed
  async trackApiUsageWithRotation(
    apiKey: string,
    operation: keyof typeof this.QUOTA_COSTS,
    count: number = 1,
    availableKeys: string[] = [],
  ): Promise<string> {
    // Track the usage first
    this.trackApiUsage(apiKey, operation, count);

    // Check if rotation is needed
    if (availableKeys.length > 1) {
      const rotatedKey = await this.checkAndRotateKey(apiKey, availableKeys);
      return rotatedKey || apiKey;
    }

    return apiKey;
  }

  // Get quota status for all provided keys
  async getAllKeysQuotaStatus(
    keys: string[],
  ): Promise<Record<string, QuotaUsage>> {
    const statuses: Record<string, QuotaUsage> = {};

    for (const key of keys) {
      try {
        statuses[key] = await this.checkQuotaUsage(key);
      } catch (error) {
        console.error(`Failed to check quota for key ${key.slice(-8)}:`, error);
        statuses[key] = {
          used: this.QUOTA_LIMIT,
          limit: this.QUOTA_LIMIT,
          percentage: 100,
          lastUpdated: new Date().toISOString(),
        };
      }
    }

    return statuses;
  }
}

export const youtubeQuotaService = new YouTubeQuotaService();
export type { QuotaUsage };

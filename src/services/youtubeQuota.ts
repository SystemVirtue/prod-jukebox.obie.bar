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
      // Try a minimal API call to check if key is valid and estimate usage
      const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${apiKey}`;
      const response = await fetch(testUrl);

      if (!response.ok) {
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.error?.errors?.[0]?.reason === "quotaExceeded") {
            return {
              used: this.QUOTA_LIMIT,
              limit: this.QUOTA_LIMIT,
              percentage: 100,
              lastUpdated: new Date().toISOString(),
            };
          }
        }
        throw new Error(`API Error: ${response.status}`);
      }

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

  // Check if a key is exhausted (90% threshold to be safe)
  isKeyExhausted(apiKey: string): boolean {
    const usage = this.quotaCache[apiKey];
    return usage ? usage.percentage >= 90 : false;
  }

  // Get the next available API key from the rotation list
  getNextAvailableKey(
    currentKey: string,
    availableKeys: string[],
  ): string | null {
    const currentIndex = availableKeys.indexOf(currentKey);

    // Start checking from the next key after current
    for (let i = 1; i < availableKeys.length; i++) {
      const nextIndex = (currentIndex + i) % availableKeys.length;
      const nextKey = availableKeys[nextIndex];

      if (!this.isKeyExhausted(nextKey)) {
        return nextKey;
      }
    }

    return null; // All keys are exhausted
  }

  // Check and trigger rotation if current key is exhausted
  async checkAndRotateKey(
    currentKey: string,
    availableKeys: string[],
  ): Promise<string | null> {
    try {
      // First check current quota status
      await this.checkQuotaUsage(currentKey);

      if (this.isKeyExhausted(currentKey)) {
        const nextKey = this.getNextAvailableKey(currentKey, availableKeys);

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

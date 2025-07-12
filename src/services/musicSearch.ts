import YTMusic from "ytmusic-api";
import { youtubeQuotaService } from "./youtubeQuota";
import { youtubeHtmlParserService } from "./youtubeHtmlParser";

export interface SearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  officialScore?: number;
  duration?: string;
  durationMinutes?: number;
}

export type SearchMethod = "youtube_api" | "ytmusic_api" | "iframe_search";

class MusicSearchService {
  private ytMusic: YTMusic | null = null;
  private isYtMusicInitialized = false;
  private lastSearchTimes: { [key: string]: number } = {};
  private readonly MIN_SEARCH_INTERVAL = 1000; // Minimum 1 second between searches

  constructor() {
    // YtMusic API is not compatible with browser environments due to CORS restrictions
    // Skip initialization to avoid console warnings
    console.log(
      "MusicSearchService initialized - YtMusic API disabled for browser compatibility",
    );
  }

  private async initYtMusic() {
    // YtMusic API is not compatible with browser environments due to CORS restrictions
    // Always skip initialization in browser environment to prevent console warnings
    if (typeof window !== "undefined") {
      this.isYtMusicInitialized = false;
      this.ytMusic = null;
      return;
    }

    // This code would only run in a server-side environment
    try {
      if (!this.isYtMusicInitialized) {
        this.ytMusic = new YTMusic();
        await this.ytMusic.initialize();
        this.isYtMusicInitialized = true;
        console.log("YtMusic API initialized successfully");
      }
    } catch (error) {
      console.error("Failed to initialize YtMusic API:", error);
      this.isYtMusicInitialized = false;
      this.ytMusic = null;
    }
  }

  async searchWithYouTubeAPI(
    query: string,
    apiKey: string,
    maxResults: number = 48,
  ): Promise<SearchResult[]> {
    try {
      // Rate limiting: prevent rapid successive searches
      const searchKey = `${apiKey.slice(-8)}-${query}`;
      const now = Date.now();
      const lastSearch = this.lastSearchTimes[searchKey] || 0;

      if (now - lastSearch < this.MIN_SEARCH_INTERVAL) {
        console.log(`[MusicSearch] Rate limited search for query: ${query}`);
        throw new Error(
          "Search rate limited. Please wait before searching again.",
        );
      }

      this.lastSearchTimes[searchKey] = now;

      // Check if quota is exhausted for this API key
      const quotaExhaustedKey = `quota-exhausted-${apiKey.slice(-8)}`;
      const quotaExhaustedTime = localStorage.getItem(quotaExhaustedKey);
      if (quotaExhaustedTime) {
        const timeSinceExhaustion = Date.now() - parseInt(quotaExhaustedTime);
        // Wait 1 hour before retrying API calls after quota exhaustion
        if (timeSinceExhaustion < 3600000) {
          throw new Error(
            "YouTube API quota exceeded for this key. Please wait or use a different API key.",
          );
        } else {
          // Clear the flag after 1 hour to allow retry
          localStorage.removeItem(quotaExhaustedKey);
        }
      }

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=${maxResults}&key=${apiKey}`;

      let response;
      try {
        response = await fetch(searchUrl);
      } catch (networkError) {
        console.error("Network error during YouTube search:", networkError);
        throw new Error(
          "Network error: Unable to connect to YouTube API. Please check your internet connection.",
        );
      }

      if (!response.ok) {
        if (response.status === 403) {
          // Set quota exhaustion flag to prevent repeated API calls
          localStorage.setItem(quotaExhaustedKey, Date.now().toString());
          throw new Error(
            "YouTube API quota exceeded. Admin panel will open automatically.",
          );
        } else if (response.status === 400) {
          throw new Error("Invalid search query or parameters.");
        } else {
          throw new Error(`YouTube API Error: ${response.status}`);
        }
      }

      const data = await response.json();

      // Track API usage (rotation will be handled at higher level)
      youtubeQuotaService.trackApiUsage(apiKey, "search", 1);

      if (!data.items || data.items.length === 0) {
        return [];
      }

      // Get video durations and embeddability info
      const videoIds = data.items.map((item: any) => item.id.videoId).join(",");
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${videoIds}&key=${apiKey}`;
      const detailsResponse = await fetch(detailsUrl);

      if (!detailsResponse.ok && detailsResponse.status === 403) {
        // Set quota exhaustion flag for subsequent API calls
        const quotaExhaustedKey = `quota-exhausted-${apiKey.slice(-8)}`;
        localStorage.setItem(quotaExhaustedKey, Date.now().toString());
        throw new Error(
          "YouTube API quota exceeded during video details fetch. Admin panel will open automatically.",
        );
      }

      const detailsData = await detailsResponse.json();

      // Track API usage for video details (rotation will be handled at higher level)
      youtubeQuotaService.trackApiUsage(apiKey, "videos", 1);

      // Create details map
      const detailsMap: Record<string, any> = {};
      for (const item of detailsData.items) {
        detailsMap[item.id] = item;
      }

      // Filter and format results
      const results = data.items
        .map((video: any) => {
          const details = detailsMap[video.id.videoId];
          return {
            ...video,
            contentDetails: details ? details.contentDetails : {},
            status: details ? details.status : {},
          };
        })
        .filter(
          (video: any) => video.status && video.status.embeddable !== false,
        )
        .map((video: any) => {
          const duration = video.contentDetails.duration || "";
          const durationMinutes = this.durationToMinutes(duration);

          return {
            id: video.id.videoId,
            title: video.snippet.title.replace(/\([^)]*\)/g, "").trim(),
            channelTitle: video.snippet.channelTitle,
            thumbnailUrl:
              video.snippet.thumbnails.medium?.url ||
              video.snippet.thumbnails.default?.url,
            videoUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            duration: this.formatDuration(duration),
            durationMinutes,
            officialScore: 0,
          };
        });

      return this.filterForOfficial(results, query);
    } catch (error) {
      console.error("YouTube API search error:", error);
      throw error;
    }
  }

  async searchWithYtMusicAPI(query: string): Promise<SearchResult[]> {
    // YtMusic API is not compatible with browser environments
    // Always throw an error to trigger fallback to YouTube API
    throw new Error(
      "YtMusic API is not supported in browser environments. Please use YouTube Data API v3 instead.",
    );
  }

  async search(
    query: string,
    method: SearchMethod,
    apiKey?: string,
    maxResults: number = 48,
  ): Promise<SearchResult[]> {
    switch (method) {
      case "iframe_search":
        // Use backend proxy for search fallback - no API key needed
        console.log(
          `[MusicSearch] Using backend proxy for search fallback: ${query}`,
        );
        try {
          const searchUrl = `http://localhost:4321/api/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`;
          const response = await fetch(searchUrl);
          if (!response.ok) {
            throw new Error(`Proxy search failed: ${response.status}`);
          }
          const data = await response.json();
          if (!data.results || !Array.isArray(data.results)) {
            throw new Error("Malformed search response from proxy");
          }
          return data.results.map((video: any) => ({
            id: video.id,
            title: video.title,
            channelTitle: video.channelTitle,
            thumbnailUrl: video.thumbnailUrl,
            videoUrl: video.videoUrl,
            duration: video.duration,
            officialScore: 0,
          }));
        } catch (err) {
          console.error("Proxy search error:", err);
          throw new Error("Unable to fetch search results from proxy backend.");
        }

      case "youtube_api":
        if (!apiKey) {
          throw new Error("YouTube API key is required for YouTube API search");
        }
        return this.searchWithYouTubeAPI(query, apiKey, maxResults);

      case "ytmusic_api":
        return this.searchWithYtMusicAPI(query);

      default:
        throw new Error(`Unsupported search method: ${method}`);
    }
  }

  private durationToMinutes(duration: string): number {
    // Parse ISO 8601 duration format (PT4M33S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || "0");
    const minutes = parseInt(match[2] || "0");
    const seconds = parseInt(match[3] || "0");

    return hours * 60 + minutes + (seconds > 30 ? 1 : 0);
  }

  private parseYtMusicDuration(duration: string): number {
    // Parse duration format like "3:45" or "1:23:45"
    const parts = duration.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] + (parts[1] > 30 ? 1 : 0); // minutes + round up seconds
    } else if (parts.length === 3) {
      return parts[0] * 60 + parts[1] + (parts[2] > 30 ? 1 : 0); // hours * 60 + minutes + round up seconds
    }
    return 0;
  }

  private formatDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "";

    const hours = parseInt(match[1] || "0");
    const minutes = parseInt(match[2] || "0");
    const seconds = parseInt(match[3] || "0");

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  }

  private filterForOfficial(
    videos: SearchResult[],
    originalQuery: string,
  ): SearchResult[] {
    const officialKeywords = [
      "official video",
      "official music video",
      "official audio",
      "official lyric video",
      "vevo",
      "official channel",
    ];

    return videos
      .map((video) => {
        let score = 0;
        const titleLower = video.title.toLowerCase();
        const channelTitleLower = video.channelTitle.toLowerCase();

        if (channelTitleLower.includes("vevo")) score += 10;

        for (const keyword of officialKeywords) {
          if (titleLower.includes(keyword)) {
            score += 3;
            break;
          }
        }

        if (channelTitleLower.includes("official")) score += 3;
        if (titleLower.includes("cover") || titleLower.includes("remix"))
          score -= 5;
        if (titleLower.includes("karaoke")) score += 3;

        return {
          ...video,
          officialScore: score,
        };
      })
      .filter((video) => (video.officialScore || 0) >= 0)
      .sort((a, b) => (b.officialScore || 0) - (a.officialScore || 0));
  }
}

export const musicSearchService = new MusicSearchService();

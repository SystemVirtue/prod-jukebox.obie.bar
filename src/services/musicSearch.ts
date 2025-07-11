import { YtMusic } from "ytmusic-api";

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

export type SearchMethod = "youtube_api" | "ytmusic_api";

class MusicSearchService {
  private ytMusic: YtMusic | null = null;
  private isYtMusicInitialized = false;

  constructor() {
    // Initialize ytmusic-api lazily
    this.initYtMusic();
  }

  private async initYtMusic() {
    try {
      if (!this.isYtMusicInitialized) {
        // Check if we're in a browser environment
        if (typeof window === "undefined") {
          throw new Error("YtMusic API not supported in this environment");
        }

        this.ytMusic = new YtMusic();
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
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=${maxResults}&key=${apiKey}`;

      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`YouTube API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return [];
      }

      // Get video durations and embeddability info
      const videoIds = data.items.map((item: any) => item.id.videoId).join(",");
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${videoIds}&key=${apiKey}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

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
    try {
      await this.initYtMusic();

      if (!this.ytMusic || !this.isYtMusicInitialized) {
        throw new Error("YtMusic API not initialized");
      }

      const searchResults = await this.ytMusic.searchSongs(query);

      if (!searchResults || searchResults.length === 0) {
        return [];
      }

      const results: SearchResult[] = searchResults
        .filter((song: any) => song.videoId && song.title && song.artist)
        .slice(0, 48) // Limit to match YouTube API results
        .map((song: any) => {
          const durationMinutes = song.duration
            ? this.parseYtMusicDuration(song.duration)
            : 0;

          return {
            id: song.videoId,
            title: song.title,
            channelTitle: Array.isArray(song.artist)
              ? song.artist.map((a: any) => a.name || a).join(", ")
              : song.artist?.name || song.artist || "Unknown Artist",
            thumbnailUrl:
              song.thumbnail?.[0]?.url || song.thumbnails?.[0]?.url || "",
            videoUrl: `https://www.youtube.com/watch?v=${song.videoId}`,
            duration: song.duration || "",
            durationMinutes,
            officialScore: 5, // YtMusic results are generally more "official"
          };
        });

      return results;
    } catch (error) {
      console.error("YtMusic API search error:", error);
      throw error;
    }
  }

  async search(
    query: string,
    method: SearchMethod,
    apiKey?: string,
    maxResults: number = 48,
  ): Promise<SearchResult[]> {
    switch (method) {
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

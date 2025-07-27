import { PlaylistItem } from "@/hooks/useJukeboxState";

export interface YouTubeVideoData {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration?: string;
  videoUrl: string;
}

class YouTubeHtmlParserService {
  private readonly CORS_PROXY = ""; // Direct fetch - browser CORS will handle this

  /**
   * Parse YouTube search results from HTML
   */
  async searchYouTube(
    query: string,
    maxResults: number = 50,
  ): Promise<YouTubeVideoData[]> {
    try {
      const url = `http://localhost:4321/api/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Proxy search failed: ${response.status}`);
      }
      const data = await response.json();
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error("Malformed search response from proxy");
      }
      return data.results;
    } catch (error) {
      console.error("[HTMLParser] Error in searchYouTube (proxy attempt):", error);
      throw new Error("Unable to fetch search results from proxy backend.");
    }
  }

  /**
   * Parse YouTube playlist from HTML
   */
  async parsePlaylist(playlistId: string): Promise<PlaylistItem[]> {
    try {
      const url = `http://localhost:4321/api/playlist?playlist=${encodeURIComponent(playlistId)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Proxy playlist failed: ${response.status}`);
      }
      const data = await response.json();
      if (data && Array.isArray(data.videos) && data.videos.length > 0) {
        console.log('[HTMLParser] Raw proxy playlist response:', data.videos);
        const mapped = data.videos.map((video: any) => ({
          id: video.id,
          videoId: video.videoId || video.id,
          title: video.title,
          channelTitle: video.channelTitle || '',
          thumbnailUrl: `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`,
          videoUrl: video.videoUrl,
          duration: '',
        }));
        console.log('[HTMLParser] Mapped playlist items:', mapped);
        return mapped;
      }
      throw new Error("Malformed playlist response from proxy");
    } catch (error) {
      console.error("[HTMLParser] Error in parsePlaylist (proxy attempt):", error);
      throw new Error("Unable to fetch playlist from proxy backend.");
    }
  }

  // Removed: generateFallbackSearchResults - all search fallback now uses backend proxy
  

  // Removed: generateFallbackPlaylist - all playlist fallback now uses backend proxy
  

  /**
   * Determine genre from search query
   */
  private getGenreForQuery(query: string): string[] {
    const queryLower = query.toLowerCase();
    const genres: string[] = [];

    if (
      queryLower.includes("rock") ||
      queryLower.includes("metal") ||
      queryLower.includes("punk")
    ) {
      genres.push("rock");
    }
    if (queryLower.includes("pop") || queryLower.includes("hits")) {
      genres.push("pop");
    }
    if (
      queryLower.includes("hip hop") ||
      queryLower.includes("rap") ||
      queryLower.includes("hip-hop")
    ) {
      genres.push("hip-hop");
    }
    if (
      queryLower.includes("electronic") ||
      queryLower.includes("dance") ||
      queryLower.includes("edm")
    ) {
      genres.push("electronic");
    }
    if (queryLower.includes("country")) {
      genres.push("country");
    }
    if (queryLower.includes("jazz") || queryLower.includes("blues")) {
      genres.push("jazz");
    }
    if (queryLower.includes("classical")) {
      genres.push("classical");
    }
    if (queryLower.includes("reggae")) {
      genres.push("reggae");
    }
    if (queryLower.includes("indie") || queryLower.includes("alternative")) {
      genres.push("indie");
    }
    if (queryLower.includes("folk")) {
      genres.push("folk");
    }

    return genres;
  }

  /**
   * Validate video ID format
   */
  private isValidVideoId(videoId: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && this.isValidVideoId(match[1])) {
        return match[1];
      }
    }

    // If it's already just a video ID
    if (this.isValidVideoId(url)) {
      return url;
    }

    return null;
  }
}

export const youtubeHtmlParserService = new YouTubeHtmlParserService();

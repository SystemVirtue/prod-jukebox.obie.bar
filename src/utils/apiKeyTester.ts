/**
 * Utility to test YouTube API key validity
 */

export interface ApiKeyTestResult {
  isValid: boolean;
  status: number;
  message: string;
  quotaUsed?: boolean;
  canSearch?: boolean;
  canAccessPlaylists?: boolean;
}

export const testApiKey = async (apiKey: string): Promise<ApiKeyTestResult> => {
  if (!apiKey || !apiKey.startsWith("AIza")) {
    return {
      isValid: false,
      status: 0,
      message: 'Invalid API key format. Must start with "AIza"',
    };
  }

  try {
    // Test with a simple search query (lowest quota cost)
    const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${apiKey}`;

    console.log("Testing API key with search endpoint...");
    const response = await fetch(testUrl);

    if (response.ok) {
      const data = await response.json();

      return {
        isValid: true,
        status: 200,
        message: "API key is valid and functional",
        quotaUsed: false,
        canSearch: true,
        canAccessPlaylists: true, // Assume true if search works
      };
    } else {
      const errorText = await response.text();

      if (response.status === 403) {
        if (errorText.includes("quotaExceeded")) {
          return {
            isValid: true,
            status: 403,
            message: "API key is valid but quota exceeded",
            quotaUsed: true,
            canSearch: false,
            canAccessPlaylists: false,
          };
        } else if (
          errorText.includes("keyInvalid") ||
          errorText.includes("invalid")
        ) {
          return {
            isValid: false,
            status: 403,
            message: "API key is invalid or disabled",
          };
        } else {
          return {
            isValid: false,
            status: 403,
            message: "Access denied. Check API key permissions.",
          };
        }
      } else if (response.status === 400) {
        return {
          isValid: false,
          status: 400,
          message: "Bad request. API key might be malformed.",
        };
      } else {
        return {
          isValid: false,
          status: response.status,
          message: `API returned error ${response.status}: ${errorText}`,
        };
      }
    }
  } catch (error) {
    console.error("API key test failed:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        isValid: false,
        status: 0,
        message:
          "Network error: Unable to reach YouTube API. Check internet connection.",
      };
    }

    return {
      isValid: false,
      status: 0,
      message: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

export const testMultipleApiKeys = async (
  apiKeys: string[],
): Promise<Record<string, ApiKeyTestResult>> => {
  const results: Record<string, ApiKeyTestResult> = {};

  for (const key of apiKeys) {
    const keyName = key.slice(-8); // Last 8 characters for identification
    results[keyName] = await testApiKey(key);

    // Add small delay between tests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
};

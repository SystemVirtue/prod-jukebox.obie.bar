/**
 * Utility to test YouTube API key validity
 */

// Track ongoing tests to prevent concurrent testing of the same key
const ongoingTests = new Set<string>();

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

  // Prevent concurrent testing of the same key
  const keyId = apiKey.slice(-8);
  if (ongoingTests.has(keyId)) {
    return {
      isValid: false,
      status: 0,
      message: "Test already in progress for this key",
    };
  }

  ongoingTests.add(keyId);

  try {
    // Test with a simple search query (lowest quota cost)
    // Use proper URL encoding and a more specific query
    const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent("music")}&type=video&maxResults=1&key=${encodeURIComponent(apiKey)}`;

    console.log("Testing API key with search endpoint...");
    const response = await fetch(testUrl);

    // Read response body once and handle all cases
    let responseData = null;
    let responseText = "";

    try {
      responseText = await response.text();
      // Try to parse as JSON
      if (responseText) {
        responseData = JSON.parse(responseText);
      }
    } catch (parseError) {
      // responseText contains the raw response, responseData is null
    }

    if (response.ok) {
      return {
        isValid: true,
        status: 200,
        message: "API key is valid and functional",
        quotaUsed: false,
        canSearch: true,
        canAccessPlaylists: true,
      };
    } else {
      // Use the already-read responseText

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
  } finally {
    // Always remove from ongoing tests
    ongoingTests.delete(keyId);
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

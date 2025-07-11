// Test utility for API key rotation - for development/testing only
import { youtubeQuotaService } from "@/services/youtubeQuota";

export const testApiKeyRotation = async () => {
  const testKeys = [
    "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4",
    "AIzaSyCKHHGkaztp8tfs2BVxiny0InE_z-kGDtY",
    "AIzaSyDy6_QI9SP5nOZRVoNa5xghSHtY3YWX5kU",
    "AIzaSyCPAY_ukeGnAGJdCvYk1bVVDxZjQRJqsdk",
  ];

  console.log("Testing API key rotation logic...");

  // Simulate heavy usage on first key
  const firstKey = testKeys[0];
  for (let i = 0; i < 100; i++) {
    youtubeQuotaService.trackApiUsage(firstKey, "search", 1);
  }

  console.log("Simulated 100 searches on first key");

  // Check rotation
  const nextKey = youtubeQuotaService.getNextAvailableKey(firstKey, testKeys);
  console.log(`Next available key: ${nextKey?.slice(-8) || "None"}`);

  // Get status of all keys
  const allStatus = await youtubeQuotaService.getAllKeysQuotaStatus(testKeys);
  console.log("All keys status:", allStatus);

  return { nextKey, allStatus };
};

// Make available in global scope for testing
if (typeof window !== "undefined") {
  (window as any).testApiKeyRotation = testApiKeyRotation;
}

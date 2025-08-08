import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { youtubeQuotaService, QuotaUsage } from "@/services/youtubeQuota";

interface ApiKeyTestResult {
  key: string;
  keyName: string;
  status: "testing" | "success" | "failed" | "quota_exceeded";
  quotaUsage?: QuotaUsage;
  error?: string;
}

interface ApiKeyTestDialogProps {
  isOpen: boolean;
  onComplete: (results: ApiKeyTestResult[]) => void;
}

export const ApiKeyTestDialog: React.FC<ApiKeyTestDialogProps> = ({
  isOpen,
  onComplete,
}) => {
  const [testResults, setTestResults] = useState<ApiKeyTestResult[]>([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dismissCountdown, setDismissCountdown] = useState<number>(0);

  const API_KEYS = [
    { key: "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4", name: "Key 1 (Primary)" },
    { key: "AIzaSyDQ_Jx4Dwje2snQisj7hEFVK9lJJ0tptcc", name: "Key 2" },
    { key: "AIzaSyDy6_QI9SP5nOZRVoNa5xghSHtY3YWX5kU", name: "Key 3" },
    { key: "AIzaSyCPAY_ukeGnAGJdCvYk1bVVDxZjQRJqsdk", name: "Key 4" },
    { key: "AIzaSyD7iB_2dHUu9yS87WD4wMbkJQduibU5vco", name: "Key 5" },
    { key: "AIzaSyCgtXTfFuUiiBsNXH6z_k9-GiCqiS0Cgso", name: "Key 6" },
    { key: "AIzaSyCKHHGkaztp8tfs2BVxiny0InE_z-kGDtY", name: "Key 7" },
    { key: "AIzaSyBGcwaCm70o4ir0CKcNIJ0V_7TeyY2cwdA", name: "Key 8" },
    { key: "AIzaSyD6lYWv9Jww_r_RCpO-EKZEyrK4vNd9FeQ", name: "Key 9" },
  ];

  
  //    key1: "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4",
  //  key2: "AIzaSyDQ_Jx4Dwje2snQisj7hEFVK9lJJ0tptcc",
   // key3: "AIzaSyDy6_QI9SP5nOZRVoNa5xghSHtY3YWX5kU",
   // key4: "AIzaSyCPAY_ukeGnAGJdCvYk1bVVDxZjQRJqsdk",
  //  key5: "AIzaSyD7iB_2dHUu9yS87WD4wMbkJQduibU5vco",
   // key6: "AIzaSyCgtXTfFuUiiBsNXH6z_k9-GiCqiS0Cgso",
   // key7: "AIzaSyCKHHGkaztp8tfs2BVxiny0InE_z-kGDtY",
  //  key8: "AIzaSyBGcwaCm70o4ir0CKcNIJ0V_7TeyY2cwdA",
    
  useEffect(() => {
    if (isOpen && !hasStarted) {
      console.log("[ApiKeyTestDialog] Starting API key tests...");
      setHasStarted(true);
      startTesting();
    }
  }, [isOpen, hasStarted]); // Include hasStarted to fix ESLint warning

  const startTesting = async () => {
    console.log("[ApiKeyTestDialog] Initializing API key tests");
    const initialResults: ApiKeyTestResult[] = API_KEYS.map((apiKey) => ({
      key: apiKey.key,
      keyName: apiKey.name,
      status: "testing",
    }));
    setTestResults(initialResults);
    setCurrentTestIndex(0);
    setIsComplete(false);

    // Test each key sequentially
    for (let i = 0; i < API_KEYS.length; i++) {
      setCurrentTestIndex(i);
      await testApiKey(i);

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsComplete(true);

    // Find the first working key and set it as selected
    setTimeout(() => {
      setTestResults((currentResults) => {
        const workingIndex = currentResults.findIndex(
          (r) => r.status === "success",
        );
        if (workingIndex >= 0) {
          setSelectedKey(API_KEYS[workingIndex].name);
        }

        // Start 3-second countdown for auto-dismiss
        setDismissCountdown(3);
        const countdownInterval = setInterval(() => {
          setDismissCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              onComplete(currentResults);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return currentResults;
      });
    }, 500); // Small delay to ensure all results are set
  };

  const testApiKey = async (index: number) => {
    const apiKey = API_KEYS[index];

    try {
      console.log(`[Init Test] Testing ${apiKey.name}...`);

      // Test the API key by checking quota
      const quotaUsage = await youtubeQuotaService.checkQuotaUsage(apiKey.key);

      setTestResults((prev) =>
        prev.map((result, i) =>
          i === index
            ? {
                ...result,
                status:
                  quotaUsage.percentage >= 90 ? "quota_exceeded" : "success",
                quotaUsage,
              }
            : result,
        ),
      );
    } catch (error) {
      console.log(`[Init Test] ${apiKey.name} failed:`, error);

      setTestResults((prev) =>
        prev.map((result, i) =>
          i === index
            ? {
                ...result,
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error",
              }
            : result,
        ),
      );
    }
  };

  const getStatusIcon = (status: ApiKeyTestResult["status"]) => {
    switch (status) {
      case "testing":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "quota_exceeded":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (result: ApiKeyTestResult) => {
    switch (result.status) {
      case "testing":
        return "Testing...";
      case "success":
        return `${result.quotaUsage?.used || 0}/${result.quotaUsage?.limit || 10000} (${result.quotaUsage?.percentage.toFixed(1) || 0}%)`;
      case "quota_exceeded":
        return `QUOTA EXCEEDED (${result.quotaUsage?.percentage.toFixed(1) || 100}%)`;
      case "failed":
        return `Failed: ${result.error}`;
      default:
        return "";
    }
  };

  const progress =
    ((currentTestIndex + (isComplete ? 1 : 0)) / API_KEYS.length) * 100;
  const successfulKeys = testResults.filter(
    (r) => r.status === "success",
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="bg-gradient-to-b from-blue-50 to-blue-100 border-blue-600 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-900">
            Testing API Key Quotas
          </DialogTitle>
          <DialogDescription className="text-blue-800">
            Testing all 5 YouTube API keys before initializing the
            application...
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-6">
            <div className="flex justify-between text-sm text-blue-700 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={result.key}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  result.status === "success"
                    ? "bg-green-50 border-green-200"
                    : result.status === "quota_exceeded"
                      ? "bg-yellow-50 border-yellow-200"
                      : result.status === "failed"
                        ? "bg-red-50 border-red-200"
                        : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <span className="font-medium text-gray-900">
                    {result.keyName}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {getStatusText(result)}
                </div>
              </div>
            ))}
          </div>

          {isComplete && (
            <div className="mt-6 p-4 bg-blue-100 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">
                Test Complete
              </h3>
              <p className="text-blue-800 text-sm mb-2">
                {successfulKeys > 0
                  ? `${successfulKeys} out of ${API_KEYS.length} API keys are available for use.`
                  : "No API keys are currently available. All keys are either quota exceeded or invalid."}
              </p>
              {selectedKey && (
                <p className="text-green-700 text-sm font-semibold mb-2">
                  ✓ {selectedKey} selected for use.
                </p>
              )}
              {dismissCountdown > 0 && (
                <p className="text-blue-600 text-sm">
                  Continuing in {dismissCountdown} second
                  {dismissCountdown !== 1 ? "s" : ""}...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Continue button removed - auto-dismiss after 3 seconds */}
      </DialogContent>
    </Dialog>
  );
};

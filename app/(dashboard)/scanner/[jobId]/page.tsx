"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { ScanProgressTracker } from "@/components/scanner/scan-progress-tracker";

import { getApiConfig } from "@/utils/api-config";

type JobStatus = "pending" | "processing" | "completed" | "failed";

export default function ScanProgressPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [status, setStatus] = useState<JobStatus>("pending");
  const [progress, setProgress] = useState(0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Wrap checkStatus in useCallback so it can be a stable dependency
  const checkStatus = useCallback(async () => {
    try {
      const apiConfig = getApiConfig();
      const headers: Record<string, string> = {};
      if (apiConfig?.apiKey) headers["x-quetext-key"] = apiConfig.apiKey;
      if (apiConfig?.baseUrl) headers["x-quetext-base-url"] = apiConfig.baseUrl;

      const res = await fetch(`/api/quetext/status?jobId=${jobId}`, { headers });
      if (!res.ok) {
        throw new Error("Failed to fetch job status");
      }

      const data = await res.json();

      // Guard against state updates after unmount
      if (!isMountedRef.current) return;

      setStatus(data.status);
      if (data.progressPercentage !== undefined) {
        setProgress(data.progressPercentage);
      } else if (data.status === "completed") {
        setProgress(100);
      }

      if (data.status === "completed") {
        toast.success("Scan completed successfully");

        // Wait a brief moment to show 100% before redirecting.
        // Store the timer ref so it can be cleared on unmount.
        redirectTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            router.push(`/reports/${jobId}`);
          }
        }, 1500);
        return;
      }

      if (data.status === "failed") {
        throw new Error(data.message || "Job failed during processing");
      }

      // If pending or processing, clear any existing poll and schedule next
      if (data.status === "pending" || data.status === "processing") {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(checkStatus, 3000);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      setStatus("failed");
      toast.error(error instanceof Error ? error.message : "An error occurred during polling");
    }
  }, [jobId]);

  useEffect(() => {
    isMountedRef.current = true;

    if (jobId) {
      checkStatus();
    }

    return () => {
      isMountedRef.current = false;
      // Clean up ALL pending timers on unmount
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [jobId, checkStatus]);

  return (
    <Container>
      <div className="py-6 md:py-10 max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/scanner")}
          className="mb-8 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Scanner
        </Button>

        <Section className="pt-0">
          <ScanProgressTracker progress={progress} status={status} />
        </Section>
        
        {status === "failed" && (
          <div className="mt-8 flex justify-center">
            <Button onClick={() => router.push("/scanner")}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Another Document
            </Button>
          </div>
        )}
      </div>
    </Container>
  );
}

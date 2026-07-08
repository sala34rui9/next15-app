"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { UploadInterface } from "@/components/scanner/upload-interface";

import { getApiConfig } from "@/utils/api-config";

export default function ScannerPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScan = async (data: { type: "file" | "text"; payload: File | string }) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      if (data.type === "file") {
        formData.append("file", data.payload as File);
      } else {
        formData.append("text", data.payload as string);
      }

      const apiConfig = getApiConfig();
      const headers: Record<string, string> = {};
      if (apiConfig?.apiKey) headers["x-quetext-key"] = apiConfig.apiKey;
      if (apiConfig?.baseUrl) headers["x-quetext-base-url"] = apiConfig.baseUrl;

      const res = await fetch("/api/quetext/scan", {
        method: "POST",
        body: formData,
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit document");
      }

      const responseData = await res.json();
      
      // Redirect immediately to the dedicated progress page
      router.push(`/scanner/${responseData.jobId}`);
    } catch (error) {
      setIsProcessing(false);
      toast.error(error instanceof Error ? error.message : "Network error occurred");
    }
  };

  return (
    <Container>
      <PageHeader 
        title="Scanner" 
        description="Run deep scans and vulnerability assessments."
      />
      <Section className="pt-0">
        <UploadInterface 
          onScan={handleScan}
          isProcessing={isProcessing}
          buttonLabel="Start Deep Scan"
          progressLabel="Initiating scan..."
        />
      </Section>
    </Container>
  );
}

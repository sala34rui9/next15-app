"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { generatePDFReport } from "@/utils/pdf-generator";
import { toast } from "sonner";

export function DownloadReportButton({ jobId }: { jobId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      toast.info("Generating PDF report...");
      
      await generatePDFReport(jobId);
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isGenerating}
      className="gap-2"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {isGenerating ? "Generating PDF..." : "Export PDF"}
    </Button>
  );
}

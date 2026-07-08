"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { ReportSummary } from "@/components/reports/report-summary";
import { ReportCharts } from "@/components/reports/report-charts";
import { MatchedSourcesTable } from "@/components/reports/matched-sources-table";
import { ComparisonViewer } from "@/components/reports/comparison-viewer";
import { DownloadReportButton } from "@/components/reports/download-report-button";
import { RiskLevel } from "@/components/ui/risk-badge";
import { Loader2 } from "lucide-react";
import { FetchReportResponse } from "@/services/quetext/quetext.types";
import { getApiConfig } from "@/utils/api-config";

export default function ReportDetailsPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  
  const [report, setReport] = useState<FetchReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const apiConfig = getApiConfig();
        const headers: Record<string, string> = {};
        if (apiConfig?.apiKey) headers["x-quetext-key"] = apiConfig.apiKey;
        if (apiConfig?.baseUrl) headers["x-quetext-base-url"] = apiConfig.baseUrl;

        const res = await fetch(`/api/quetext/report?jobId=${jobId}`, { headers });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch report");
        }
        
        const data = await res.json();
        console.log("Raw Report Data from Quetext:", data); // Helpful for debugging exact API shape
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    
    if (jobId) {
      fetchReport();
    }
  }, [jobId]);

  if (loading) {
    return (
      <Container className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading report analysis...</p>
        </div>
      </Container>
    );
  }

  if (error || !report) {
    return (
      <Container className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-2xl font-semibold">Failed to Load Report</h2>
          <p className="text-muted-foreground">{error || "The report could not be retrieved."}</p>
        </div>
      </Container>
    );
  }

  // Safely extract fields with fallbacks in case API shape differs
  const matches = report.matches || [];
  const originalityScore = report.originalityScore ?? 100;
  const wordCount = report.wordCount ?? 0;

  // Derive top-level risk for the summary
  let overallRisk: RiskLevel = "Low";
  if (originalityScore < 70) overallRisk = "High";
  else if (originalityScore < 90) overallRisk = "Medium";

  return (
    <Container>
      <PageHeader 
        title="Analysis Report" 
        description={`Report for Job ID: ${jobId}`}
        actions={<DownloadReportButton jobId={jobId} />}
      />
      <Section className="pt-4 space-y-8">
        <ReportSummary 
          originalityScore={originalityScore}
          wordCount={wordCount}
          matchCount={matches.length}
          riskLevel={overallRisk}
        />
        <ReportCharts 
          originalityScore={originalityScore}
          matches={matches}
        />
        
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">Detailed Findings</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Review the exact internet sources that matched your document and compare them side-by-side.
          </p>
          <ComparisonViewer matches={matches} />
          <MatchedSourcesTable matches={matches} />
        </div>
      </Section>
    </Container>
  );
}

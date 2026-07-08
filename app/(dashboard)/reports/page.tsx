"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Loader2,
  CheckSquare,
  Square,
  Inbox,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { generatePDFReport } from "@/utils/pdf-generator";

interface ScanRecord {
  jobId: string;
  completedAt: string;
  wordCount?: number;
  originalityScore?: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ScanRecord[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchHistory() {
      try {
        const rawConfig = localStorage.getItem("pg_api_config");
        let headers: Record<string, string> = {};
        if (rawConfig) {
          const config = JSON.parse(rawConfig);
          if (config.apiKey) headers["x-quetext-key"] = config.apiKey;
          if (config.baseUrl) headers["x-quetext-base-url"] = config.baseUrl;
        }

        const res = await fetch("/api/quetext/history", { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const mapped: ScanRecord[] = data.map((item: any) => ({
              jobId: item.id,
              completedAt: item.created_at,
              originalityScore: item.score,
            }));
            setReports(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      }
    }
    fetchHistory();
  }, []);

  const toggleSelect = (jobId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === reports.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(reports.map((r) => r.jobId)));
    }
  };

  const handleDelete = (jobId: string) => {
    const updated = reports.filter((r) => r.jobId !== jobId);
    setReports(updated);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
    toast.success("Report removed");
  };

  const handleExportSelected = async () => {
    if (selected.size === 0) {
      toast.warning("Select at least one report to export");
      return;
    }

    setExporting(true);
    try {
      for (const jobId of selected) {
        await generatePDFReport(jobId);
      }
      toast.success(`Exported ${selected.size} report${selected.size > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to export some reports");
    } finally {
      setExporting(false);
    }
  };

  const getRiskColor = (score?: number) => {
    if (score === undefined) return "text-muted-foreground";
    if (score < 50) return "text-destructive";
    if (score < 80) return "text-amber-500";
    return "text-emerald-500";
  };

  const getRiskLabel = (score?: number) => {
    if (score === undefined) return "—";
    if (score < 50) return "High Risk";
    if (score < 80) return "Medium";
    return "Low Risk";
  };

  if (!mounted) return null;

  return (
    <Container>
      <PageHeader
        title="Reports"
        description="View and export your plagiarism analysis reports."
        actions={
          <div className="flex items-center gap-2">
            {reports.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
                className="text-muted-foreground"
              >
                {selected.size === reports.length ? (
                  <CheckSquare className="mr-2 h-4 w-4" />
                ) : (
                  <Square className="mr-2 h-4 w-4" />
                )}
                {selected.size === reports.length ? "Deselect All" : "Select All"}
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={handleExportSelected}
              disabled={selected.size === 0 || exporting}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Selected ({selected.size})
            </Button>
          </div>
        }
      />
      <Section className="pt-0">
        {reports.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="p-4 rounded-full bg-muted">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No reports yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Run your first plagiarism scan to see reports here.
                </p>
              </div>
              <Button onClick={() => router.push("/scanner")}>
                Go to Scanner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {reports.map((report) => {
                const isSelected = selected.has(report.jobId);
                return (
                  <motion.div
                    key={report.jobId}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  >
                    <Card
                      className={cn(
                        "group relative cursor-pointer transition-all hover:shadow-md",
                        isSelected && "ring-2 ring-primary shadow-md"
                      )}
                      onClick={() => toggleSelect(report.jobId)}
                    >
                      {/* Selection indicator */}
                      <div
                        className={cn(
                          "absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 group-hover:border-muted-foreground/60"
                        )}
                      >
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      <CardContent className="p-5 space-y-4">
                        {/* Icon + Job ID */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              Report {report.jobId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(report.completedAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Metrics row */}
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-muted-foreground">Originality:</span>{" "}
                            <span className={cn("font-bold", getRiskColor(report.originalityScore))}>
                              {report.originalityScore !== undefined
                                ? `${report.originalityScore}%`
                                : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Words:</span>{" "}
                            <span className="font-medium">
                              {report.wordCount?.toLocaleString() ?? "—"}
                            </span>
                          </div>
                        </div>

                        {/* Risk badge */}
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              report.originalityScore === undefined
                                ? "bg-muted text-muted-foreground"
                                : report.originalityScore < 50
                                  ? "bg-destructive/10 text-destructive"
                                  : report.originalityScore < 80
                                    ? "bg-amber-500/10 text-amber-600"
                                    : "bg-emerald-500/10 text-emerald-600"
                            )}
                          >
                            {getRiskLabel(report.originalityScore)}
                          </span>

                          {/* Action buttons */}
                          <div
                            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => router.push(`/reports/${report.jobId}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(report.jobId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Section>
    </Container>
  );
}

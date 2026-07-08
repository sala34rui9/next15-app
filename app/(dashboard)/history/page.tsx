"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ArrowUpDown,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  FileText,
  Loader2,
  Inbox
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { cn } from "@/lib/utils";
import { RiskBadge, RiskLevel } from "@/components/ui/risk-badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generatePDFReport } from "@/utils/pdf-generator";

interface HistoryRecord {
  jobId: string;
  completedAt: string;
  wordCount?: number;
  originalityScore?: number;
}

type SortKey = keyof HistoryRecord;
type SortOrder = "asc" | "desc";

export default function HistoryPage() {
  const router = useRouter();
  
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("completedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

  const itemsPerPage = 6;

  const [isLoading, setIsLoading] = useState(true);

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
          // API returns an array of reports: { id, created_at, score }
          // `score` is the plagiarism percentage; we display originality = 100 - score
          if (Array.isArray(data)) {
            const mapped: HistoryRecord[] = data.map((item: any) => ({
              jobId: item.id,
              completedAt: item.created_at,
              originalityScore: item.score != null ? Math.max(0, Math.min(100, 100 - item.score)) : undefined,
              wordCount: item.word_count ?? item.words,
            }));
            setHistory(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder(key === "completedAt" || key === "originalityScore" ? "desc" : "asc");
    }
  };

  const handleDelete = async (id: string) => {
    // Remove from local state (UI-only deletion; history is fetched from API)
    const updated = history.filter(r => r.jobId !== id);
    setHistory(updated);
    toast.success("Report removed from history");
  };

  const handleDownloadPdf = async (id: string, name: string) => {
    try {
      setIsGeneratingPdf(id);
      toast.info(`Generating PDF for ${name}...`);
      await generatePDFReport(id);
      toast.success("PDF Downloaded");
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  const getRiskLevel = (score?: number): RiskLevel => {
    if (score === undefined) return "Low"; // fallback
    if (score < 50) return "High";
    if (score < 80) return "Medium";
    return "Low";
  };

  const filteredAndSorted = useMemo(() => {
    let result = history;

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(item => 
        item.jobId.toLowerCase().includes(lowerSearch)
      );
    }

    result = [...result].sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      if (aVal === undefined) aVal = 0;
      if (bVal === undefined) bVal = 0;

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [history, search, sortKey, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  if (!mounted) return null;

  return (
    <Container>
      <PageHeader 
        title="Scan History" 
        description="View and manage all your past plagiarism reports."
      />
      <Section className="pt-0">
        {history.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="p-4 rounded-full bg-muted">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No history yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Run your first plagiarism scan to start building your history.
                </p>
              </div>
              <Button onClick={() => router.push("/scanner")}>
                Go to Scanner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full border-muted/60 shadow-sm">
            <div className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by Job ID..." 
                  className="pl-9 bg-background focus-visible:ring-1"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="text-sm text-muted-foreground w-full sm:w-auto text-right">
                {filteredAndSorted.length} reports found
              </div>
            </div>
            
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("jobId")} className="h-8 p-0 hover:bg-transparent font-medium">
                          Report ID
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("completedAt")} className="h-8 p-0 hover:bg-transparent font-medium">
                          Date Scanned
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        <Button variant="ghost" onClick={() => handleSort("wordCount")} className="h-8 p-0 hover:bg-transparent font-medium">
                          Word Count
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("originalityScore")} className="h-8 p-0 hover:bg-transparent font-medium">
                          Originality
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Risk Level
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {paginatedData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                            No history found matching your search.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedData.map((item) => (
                          <motion.tr 
                            key={item.jobId}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                            className="group border-b transition-colors hover:bg-muted/30"
                          >
                            <TableCell className="font-medium max-w-[200px]">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="truncate group-hover:text-primary transition-colors cursor-pointer" onClick={() => router.push(`/reports/${item.jobId}`)}>
                                    Report {item.jobId}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-mono">{item.jobId}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(item.completedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                              {item.wordCount?.toLocaleString() ?? "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                  {item.originalityScore !== undefined ? (
                                    <div 
                                      className={cn("h-full rounded-full", item.originalityScore < 50 ? "bg-destructive" : item.originalityScore < 80 ? "bg-amber-500" : "bg-emerald-500")}
                                      style={{ width: `${item.originalityScore}%` }}
                                    />
                                  ) : null}
                                </div>
                                <span className="text-sm font-semibold">
                                  {item.originalityScore !== undefined ? `${item.originalityScore}%` : "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <RiskBadge risk={getRiskLevel(item.originalityScore)} />
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                                  <span className="sr-only">Open menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px]">
                                  <DropdownMenuLabel>Report Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => router.push(`/reports/${item.jobId}`)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDownloadPdf(item.jobId, `Report ${item.jobId}`)}
                                    disabled={isGeneratingPdf === item.jobId}
                                  >
                                    {isGeneratingPdf === item.jobId ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4 mr-2" />
                                    )}
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                    onClick={() => handleDelete(item.jobId)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Record
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            
            {totalPages > 1 && (
              <div className="border-t p-4 flex items-center justify-between text-sm text-muted-foreground bg-muted/10">
                <div>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="font-medium px-2 text-foreground">
                    {currentPage} / {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </Section>
    </Container>
  );
}

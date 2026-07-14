"use client";

import { useState, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowUpDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { RiskBadge, RiskLevel } from "@/components/ui/risk-badge";
import { MatchBadge, MatchType } from "@/components/ui/match-badge";
import { MatchDetail } from "@/services/quetext/quetext.types";

interface MatchedSourcesTableProps {
  matches: MatchDetail[];
}

interface DerivedSource {
  id: string;
  url: string;
  title: string;
  type: MatchType;
  similarity: number;
  words: number;
  risk: RiskLevel;
  snippet: string;
  highlightedSnippet: string;
}

type SortKey = keyof Pick<DerivedSource, "title" | "similarity" | "words" | "risk">;
type SortOrder = "asc" | "desc";

export function MatchedSourcesTable({ matches }: MatchedSourcesTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("similarity");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const itemsPerPage = 5;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc"); // Default to desc for a new key
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRows(next);
  };

  // Derive full UI data from the simplified API MatchDetail
  const derivedSources: DerivedSource[] = useMemo(() => {
    return matches.map((m, i) => {
      const similarity = m.similarityScore;
      let risk: RiskLevel = "Low";
      if (similarity >= 80) risk = "High";
      else if (similarity >= 50) risk = "Medium";

      let type: MatchType = "Paraphrased";
      if (similarity >= 95) type = "Exact Match";
      else if (similarity >= 80) type = "Slight Changes";

      const textContent = m.matchedText || "";

      return {
        id: `match-${i}`,
        url: m.sourceUrl || "#",
        title: m.sourceName || m.sourceUrl || "Unknown Source",
        type,
        similarity,
        words: textContent.split(/\s+/).length,
        risk,
        snippet: textContent,
        highlightedSnippet: m.highlightedSnippet || "",
      };
    });
  }, [matches]);

  // Filter & Sort Data
  const filteredAndSortedData = useMemo(() => {
    let result = derivedSources;

    // Search
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(lowerSearch) || 
        item.url.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      // Custom risk sort logic
      if (sortKey === "risk") {
        const riskWeight = { "High": 3, "Medium": 2, "Low": 1 };
        aVal = riskWeight[a.risk as RiskLevel];
        bVal = riskWeight[b.risk as RiskLevel];
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [search, sortKey, sortOrder, derivedSources]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  return (
    <Card className="w-full border-muted/60 shadow-sm mt-8 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-display text-base font-semibold uppercase tracking-wider">Plagiarized Sources</CardTitle>
            <CardDescription>Detailed breakdown of matched internet sources.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search domains or titles..." 
              className="pl-9 bg-muted/50 focus-visible:bg-background"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); // Reset page on search
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("title")} className="h-8 p-0 hover:bg-transparent text-[11px] font-semibold uppercase tracking-wider">
                    Source
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("similarity")} className="h-8 p-0 hover:bg-transparent text-[11px] font-semibold uppercase tracking-wider">
                    Similarity
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell text-[11px] font-semibold uppercase tracking-wider">Type</TableHead>
                <TableHead className="hidden sm:table-cell">
                  <Button variant="ghost" onClick={() => handleSort("words")} className="h-8 p-0 hover:bg-transparent text-[11px] font-semibold uppercase tracking-wider">
                    Words
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort("risk")} className="h-8 p-0 hover:bg-transparent text-[11px] font-semibold uppercase tracking-wider">
                    Risk Level
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No sources found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => {
                  const isExpanded = expandedRows.has(item.id);
                  return (
                    <Fragment key={item.id}>
                      <TableRow 
                        className={cn("group cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-muted/20", isExpanded && "bg-muted/20 hover:bg-muted/20")} 
                        onClick={() => toggleRow(item.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleRow(item.id);
                          }
                        }}
                      >
                        <TableCell className="w-12 text-center text-muted-foreground">
                          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                            <ChevronRight className="w-4 h-4 mx-auto" />
                          </motion.div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex flex-col cursor-help">
                                <span className="truncate group-hover:text-primary transition-colors flex items-center gap-2">
                                  {item.url && item.url !== "#" && (
                                    <img
                                      src={`https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=16`}
                                      alt=""
                                      className="w-3.5 h-3.5 rounded-sm shrink-0"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                  )}
                                  <span className="truncate">{item.title}</span>
                                </span>
                                <span className="text-xs text-muted-foreground font-normal truncate flex items-center gap-1 mt-0.5">
                                  {(item.url && item.url !== "#" ? new URL(item.url).hostname.replace('www.', '') : "unknown source")}
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold text-xs">{item.title}</p>
                                <p className="font-mono text-[10px] text-muted-foreground">{item.similarity}% match</p>
                                {item.snippet && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 pt-1 border-t">
                                    &ldquo;{item.snippet.slice(0, 120)}...&rdquo;
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-700",
                                  item.similarity > 80 ? "bg-[var(--risk-high)]" : item.similarity > 50 ? "bg-[var(--risk-medium)]" : "bg-[var(--risk-low)]"
                                )}
                                style={{ width: `${item.similarity}%` }}
                              />
                            </div>
                            <span className="font-mono text-sm font-bold tracking-tight">{item.similarity}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <MatchBadge type={item.type} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {item.words}
                        </TableCell>
                        <TableCell className="text-right">
                          <RiskBadge risk={item.risk as RiskLevel} />
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Row Content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <TableRow className="bg-muted/10 hover:bg-muted/10 border-b-0">
                            <TableCell colSpan={6} className="p-0 border-b-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 sm:p-6 sm:pl-16 flex flex-col md:flex-row gap-6">
                                  <div className="flex-1 space-y-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Original Text (Your Document)</h4>
                                    <div className="p-3 rounded-lg bg-card border text-sm leading-relaxed text-foreground shadow-sm relative">
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />
                                      {item.snippet}
                                    </div>
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Matched Text (Source)</h4>
                                      <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mb-2">
                                        View Source <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm leading-relaxed text-foreground shadow-sm relative">
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive rounded-l-lg" />
                                      {item.highlightedSnippet || item.snippet}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="border-t p-4 flex items-center justify-between text-sm text-muted-foreground bg-muted/20">
          <div>
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} sources
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
  );
}

"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, Info, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { MatchDetail } from "@/services/quetext/quetext.types";
import { motion, AnimatePresence } from "framer-motion";

interface ComparisonViewerProps {
  matches: MatchDetail[];
  documentText?: string | null;
}

export function ComparisonViewer({ matches, documentText }: ComparisonViewerProps) {
  const [activeMatchIndex, setActiveMatchIndex] = useState<number | null>(null);

  // Helper to extract domain from URL
  const getDomain = (url?: string) => {
    if (!url) return "Unknown Source";
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Helper to build a Text Fragment URL for browser-native highlighting
  const buildTextFragmentUrl = (url?: string, text?: string) => {
    if (!url) return "#";
    if (!text) return url;
    try {
      const cleanText = text.trim();
      const words = cleanText.split(/\s+/);
      let fragment = "";
      if (words.length > 8) {
        // Use first 4 words and last 4 words
        const start = encodeURIComponent(words.slice(0, 4).join(" "));
        const end = encodeURIComponent(words.slice(-4).join(" "));
        fragment = `#:~:text=${start},${end}`;
      } else {
        fragment = `#:~:text=${encodeURIComponent(cleanText)}`;
      }
      
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}${fragment}`;
    } catch {
      return url;
    }
  };

  // Build the left-side document content
  const leftContent = useMemo(() => {
    if (!matches || matches.length === 0) {
      return <span className="text-muted-foreground italic">No matches found in this document.</span>;
    }

    // If we have the full original document text, highlight the matches within it
    if (documentText) {
      interface HighlightSpan {
        start: number;
        end: number;
        matchIndex: number;
      }

      const spans: HighlightSpan[] = [];
      matches.forEach((m, i) => {
        if (!m.matchedText) return;
        let startIndex = 0;
        // Find all occurrences of the snippet in the full text
        while (startIndex < documentText.length) {
          const pos = documentText.indexOf(m.matchedText, startIndex);
          if (pos === -1) break;
          spans.push({ start: pos, end: pos + m.matchedText.length, matchIndex: i });
          startIndex = pos + m.matchedText.length;
        }
      });

      // Sort by start index
      spans.sort((a, b) => a.start - b.start);

      // Merge overlapping spans (greedy, takes the first one)
      const mergedSpans: HighlightSpan[] = [];
      let lastEnd = -1;
      for (const span of spans) {
        if (span.start >= lastEnd) {
          mergedSpans.push(span);
          lastEnd = span.end;
        }
      }

      const elements = [];
      let cursor = 0;
      for (const span of mergedSpans) {
        if (span.start > cursor) {
          elements.push(<span key={`text-${cursor}`}>{documentText.slice(cursor, span.start)}</span>);
        }
        
        const isActive = activeMatchIndex === span.matchIndex;
        elements.push(
          <span 
            key={`match-${span.matchIndex}-${span.start}`}
            onClick={() => setActiveMatchIndex(isActive ? null : span.matchIndex)}
            className={cn(
              "transition-all duration-200 rounded-[3px] py-0.5 cursor-pointer underline decoration-destructive/30 decoration-2 underline-offset-2",
              !isActive && "bg-destructive/10 text-destructive-foreground hover:bg-destructive/20",
              isActive && "bg-destructive text-destructive-foreground font-medium shadow-sm",
              activeMatchIndex !== null && !isActive && "opacity-40"
            )}
          >
            {documentText.slice(span.start, span.end)}
          </span>
        );
        cursor = span.end;
      }
      
      if (cursor < documentText.length) {
        elements.push(<span key={`text-${cursor}`}>{documentText.slice(cursor)}</span>);
      }

      return <div className="whitespace-pre-wrap">{elements}</div>;
    }

    // Fallback: If documentText isn't available, stitch snippets together
    return (
      <div className="whitespace-pre-wrap">
        {matches.map((m, index) => {
          const isActive = activeMatchIndex === index;
          return (
            <span key={`fallback-${index}`}>
              {index > 0 && <span className="text-muted-foreground italic">{"\n\n[ ... omitted non-matching text ... ]\n\n"}</span>}
              <span
                onClick={() => setActiveMatchIndex(isActive ? null : index)}
                className={cn(
                  "transition-all duration-200 rounded-[3px] py-0.5 cursor-pointer underline decoration-destructive/30 decoration-2 underline-offset-2",
                  !isActive && "bg-destructive/10 text-destructive-foreground hover:bg-destructive/20",
                  isActive && "bg-destructive text-destructive-foreground font-medium shadow-sm",
                  activeMatchIndex !== null && !isActive && "opacity-40"
                )}
              >
                {m.matchedText}
              </span>
            </span>
          );
        })}
      </div>
    );
  }, [matches, documentText, activeMatchIndex]);

  return (
    <Card className="w-full border-muted/60 shadow-sm mt-8 overflow-hidden">
      <CardHeader className="pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Comparison Viewer
          </CardTitle>
          <CardDescription>Click a highlighted section or a match card to compare side-by-side.</CardDescription>
        </div>
      </CardHeader>
      
      <div className="flex flex-col lg:flex-row h-[600px] divide-y lg:divide-y-0 lg:divide-x border-b">
        
        {/* Left Side: Your Document */}
        <div className="flex-1 flex flex-col bg-background/50 relative">
          <div className="p-3 border-b bg-muted/5 flex items-center justify-between sticky top-0 z-10">
            <Badge variant="outline" className="bg-background">Your Document</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-foreground/90 scroll-smooth">
            {leftContent}
          </div>
        </div>

        {/* Right Side: Plagiarism Matches Sidebar */}
        <div className="w-full lg:w-[400px] flex flex-col bg-muted/10 relative">
          <div className="p-3 border-b bg-muted/20 flex items-center justify-between sticky top-0 z-10">
            <Badge variant="destructive" className="flex items-center gap-1">
              Plagiarism Matches
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">{matches.length} found</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth">
            {matches.length === 0 ? (
              <div className="text-center p-6 text-sm text-muted-foreground italic">No matches found.</div>
            ) : (
              matches.map((m, index) => {
                const isActive = activeMatchIndex === index;
                const similarity = m.similarityScore || 0;
                
                return (
                  <div 
                    key={`sidebar-${index}`}
                    className={cn(
                      "border rounded-lg transition-all overflow-hidden bg-card cursor-pointer hover:border-destructive/50",
                      isActive ? "border-destructive ring-1 ring-destructive/20 shadow-sm" : "border-muted"
                    )}
                    onClick={() => setActiveMatchIndex(isActive ? null : index)}
                  >
                    {/* Card Header (Always visible) */}
                    <div className="p-3 flex items-start gap-3">
                      <div className={cn(
                        "flex items-center justify-center px-2 py-1 rounded text-xs font-bold",
                        similarity > 80 ? "bg-destructive/10 text-destructive" : similarity > 50 ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                      )}>
                        {similarity}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate pr-2">{getDomain(m.sourceUrl)}</div>
                        {m.sourceUrl && (
                          <div className="text-xs text-muted-foreground truncate opacity-80 mt-0.5">
                            {m.sourceUrl}
                          </div>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1",
                        isActive && "rotate-90 text-destructive"
                      )} />
                    </div>

                    {/* Card Body (Expanded state) */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="px-3 pb-4 pt-1 border-t border-muted/50 bg-destructive/5">
                            <div className="flex items-center justify-between mb-2 mt-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-destructive">Matched Source Text</span>
                              {m.sourceUrl && (
                                <a 
                                  href={buildTextFragmentUrl(m.sourceUrl, m.matchedText)} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  Visit <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div 
                              className="text-sm text-foreground/90 leading-relaxed max-h-[250px] overflow-y-auto pr-2 custom-scrollbar [&>mark]:bg-amber-200/60 dark:[&>mark]:bg-amber-900/60 [&>mark]:text-inherit [&>mark]:rounded-sm [&>mark]:px-0.5 [&>b]:bg-amber-200/60 dark:[&>b]:bg-amber-900/60 [&>b]:text-inherit [&>b]:rounded-sm [&>b]:px-0.5"
                              dangerouslySetInnerHTML={{ __html: m.highlightedSnippet || m.matchedText || "No text available." }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-muted/5 p-3 flex flex-col sm:flex-row items-center gap-2 text-xs text-muted-foreground justify-center border-t">
        <Info className="w-4 h-4 text-primary" />
        {documentText 
          ? "The full passage is visible above. Click highlighted portions to see exactly where they matched the internet." 
          : "Full text is not available for this session. Showing stitched snippets."}
      </div>
    </Card>
  );
}

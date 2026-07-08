"use client";

import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Maximize2, ExternalLink, Link2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MatchDetail } from "@/services/quetext/quetext.types";

interface ComparisonViewerProps {
  matches: MatchDetail[];
}

interface Segment {
  id: string;
  text: string;
  isMatch: boolean;
  matchGroup?: string;
}

export function ComparisonViewer({ matches }: ComparisonViewerProps) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  
  // Convert API matches into display segments for the left side (Your Document)
  const leftSegments: Segment[] = useMemo(() => {
    if (matches.length === 0) {
      return [{ id: "empty", text: "No matches found in this document.", isMatch: false }];
    }

    const segments: Segment[] = [];
    matches.forEach((m, index) => {
      if (index > 0) {
        segments.push({
          id: `spacer-${index}`,
          text: "\n\n[ ... omitted non-matching text ... ]\n\n",
          isMatch: false,
        });
      }
      segments.push({
        id: `match-${index}`,
        text: m.matchedText || "",
        isMatch: true,
        matchGroup: `group-${index}`,
      });
    });
    return segments;
  }, [matches]);

  // Convert API matches into display segments for the right side (Matched Source)
  const rightSegments: Segment[] = useMemo(() => {
    if (matches.length === 0) {
      return [{ id: "empty", text: "No matches found in this document.", isMatch: false }];
    }

    const segments: Segment[] = [];
    matches.forEach((m, index) => {
      if (index > 0) {
        segments.push({
          id: `spacer-${index}`,
          text: "\n\n[ ... omitted non-matching text ... ]\n\n",
          isMatch: false,
        });
      }
      segments.push({
        id: `match-${index}`,
        text: m.highlightedSnippet || m.matchedText || "",
        isMatch: true,
        matchGroup: `group-${index}`,
      });
    });
    return segments;
  }, [matches]);

  // Refs for synchronized scrolling
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  const handleScrollLeft = (e: React.UIEvent<HTMLDivElement>) => {
    if (!leftScrollRef.current || !rightScrollRef.current) return;
    if (isSyncingRight.current) {
      isSyncingRight.current = false;
      return;
    }
    
    isSyncingLeft.current = true;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const percentage = scrollTop / (scrollHeight - clientHeight);
    
    const rightScrollHeight = rightScrollRef.current.scrollHeight;
    const rightClientHeight = rightScrollRef.current.clientHeight;
    rightScrollRef.current.scrollTop = percentage * (rightScrollHeight - rightClientHeight);
  };

  const handleScrollRight = (e: React.UIEvent<HTMLDivElement>) => {
    if (!leftScrollRef.current || !rightScrollRef.current) return;
    if (isSyncingLeft.current) {
      isSyncingLeft.current = false;
      return;
    }
    
    isSyncingRight.current = true;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const percentage = scrollTop / (scrollHeight - clientHeight);
    
    const leftScrollHeight = leftScrollRef.current.scrollHeight;
    const leftClientHeight = leftScrollRef.current.clientHeight;
    leftScrollRef.current.scrollTop = percentage * (leftScrollHeight - leftClientHeight);
  };

  return (
    <Card className="w-full border-muted/60 shadow-sm mt-8">
      <CardHeader className="pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Plagiarism Comparison Viewer
          </CardTitle>
          <CardDescription>Hover over highlighted sections to see exact matches side-by-side.</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <Maximize2 className="w-4 h-4 mr-2" />
          Full Screen
        </Button>
      </CardHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x border-b">
        
        {/* Left Side: Uploaded Document */}
        <div className="flex flex-col h-[500px] bg-muted/5">
          <div className="p-3 border-b bg-muted/20 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-background">Your Document</Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline-block">Scanned Text</span>
            </div>
          </div>
          
          <div 
            ref={leftScrollRef}
            className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-foreground/90 space-y-2 relative scroll-smooth whitespace-pre-wrap"
            onScroll={handleScrollLeft}
          >
            <p>
              {leftSegments.map((segment) => (
                <span
                  key={segment.id}
                  onMouseEnter={() => segment.isMatch && setActiveGroup(segment.matchGroup || null)}
                  onMouseLeave={() => setActiveGroup(null)}
                  className={cn(
                    "transition-all duration-200 rounded-[3px] py-0.5",
                    !segment.isMatch && "text-muted-foreground italic",
                    segment.isMatch && "cursor-pointer underline decoration-destructive/30 decoration-2 underline-offset-2",
                    segment.isMatch && !activeGroup && "bg-destructive/10 text-destructive-foreground",
                    segment.isMatch && activeGroup === segment.matchGroup && "bg-destructive text-destructive-foreground font-medium shadow-sm",
                    segment.isMatch && activeGroup && activeGroup !== segment.matchGroup && "opacity-40"
                  )}
                >
                  {segment.text}
                </span>
              ))}
            </p>
          </div>
        </div>

        {/* Right Side: Matched Source */}
        <div className="flex flex-col h-[500px] bg-muted/5">
          <div className="p-3 border-b bg-muted/20 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="flex items-center gap-1">
                Matched Sources
              </Badge>
            </div>
          </div>
          
          <div 
            ref={rightScrollRef}
            className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-foreground/90 space-y-2 relative scroll-smooth whitespace-pre-wrap"
            onScroll={handleScrollRight}
          >
            <p>
              {rightSegments.map((segment) => (
                <span
                  key={segment.id}
                  onMouseEnter={() => segment.isMatch && setActiveGroup(segment.matchGroup || null)}
                  onMouseLeave={() => setActiveGroup(null)}
                  className={cn(
                    "transition-all duration-200 rounded-[3px] py-0.5 [&>b]:font-bold [&>b]:bg-amber-200/50 dark:[&>b]:bg-amber-900/50 [&>b]:px-0.5 [&>b]:rounded-sm",
                    !segment.isMatch && "text-muted-foreground italic",
                    segment.isMatch && "cursor-pointer underline decoration-amber-500/30 decoration-2 underline-offset-2",
                    segment.isMatch && !activeGroup && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                    segment.isMatch && activeGroup === segment.matchGroup && "bg-amber-500 text-primary-foreground font-medium shadow-sm",
                    segment.isMatch && activeGroup && activeGroup !== segment.matchGroup && "opacity-40"
                  )}
                  dangerouslySetInnerHTML={segment.isMatch ? { __html: segment.text } : undefined}
                >
                  {!segment.isMatch ? segment.text : null}
                </span>
              ))}
            </p>
          </div>
        </div>

      </div>
      <CardContent className="bg-muted/10 p-3 flex items-center gap-2 text-xs text-muted-foreground justify-center border-t">
        <Info className="w-4 h-4" />
        Scrolling is synchronized between the two panels. Click or hover on highlighted text to compare differences.
      </CardContent>
    </Card>
  );
}

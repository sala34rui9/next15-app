"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MatchDetail } from "@/services/quetext/quetext.types";
import { cn } from "@/lib/utils";

interface SimilarityHeatmapProps {
  matches: MatchDetail[];
  onSelectMatch?: (index: number) => void;
}

interface HeatmapCell {
  id: string;
  domain: string;
  url: string;
  similarity: number;
  words: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function buildSquarifiedLayout(matches: MatchDetail[]): HeatmapCell[] {
  if (matches.length === 0) return [];

  const items = matches.map((m, i) => ({
    id: `match-${i}`,
    domain: m.sourceName || (m.sourceUrl ? new URL(m.sourceUrl).hostname.replace("www.", "") : "Unknown"),
    url: m.sourceUrl || "",
    similarity: m.similarityScore,
    words: (m.matchedText || "").split(/\s+/).length,
  }));

  const totalWords = items.reduce((sum, item) => sum + item.words, 0) || 1;
  const containerWidth = 100;
  const containerHeight = 100;

  const cells: HeatmapCell[] = [];
  let x = 0;
  let y = 0;
  let remainingWidth = containerWidth;
  let remainingHeight = containerHeight;

  items.forEach((item, i) => {
    const areaFraction = Math.max(item.words / totalWords, 0.05);
    const area = areaFraction * containerWidth * containerHeight;

    const isEven = i % 2 === 0;
    const width = isEven ? remainingWidth : area / remainingHeight;
    const height = isEven ? area / remainingWidth : remainingHeight;

    cells.push({
      ...item,
      x,
      y,
      width: Math.max(width, 4),
      height: Math.max(height, 4),
    });

    if (isEven) {
      x += width;
      remainingWidth -= width;
    } else {
      y += height;
      remainingHeight -= height;
    }
  });

  return cells;
}

function getCellColor(similarity: number): string {
  if (similarity >= 90) return "oklch(0.6 0.2 25)";
  if (similarity >= 70) return "oklch(0.65 0.18 45)";
  if (similarity >= 50) return "oklch(0.75 0.15 80)";
  return "oklch(0.7 0.12 140)";
}

export function SimilarityHeatmap({ matches, onSelectMatch }: SimilarityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const cells = useMemo(() => buildSquarifiedLayout(matches), [matches]);

  return (
    <Card className="w-full border-muted/60 shadow-sm mt-6 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-semibold uppercase tracking-wider">Source Heatmap</CardTitle>
        <CardDescription>Size = matched words, Color intensity = similarity score</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-[280px] w-full">
          <AnimatePresence>
            {cells.map((cell, index) => {
              const isHovered = hoveredCell === cell.id;
              return (
                <motion.div
                  key={cell.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    "absolute rounded-lg border border-border/50 cursor-pointer transition-all duration-200 flex items-center justify-center text-[10px] font-semibold overflow-hidden",
                    isHovered ? "z-10 shadow-lg ring-2 ring-primary/30" : "z-0"
                  )}
                  style={{
                    left: `${cell.x}%`,
                    top: `${cell.y}%`,
                    width: `${cell.width}%`,
                    height: `${cell.height}%`,
                    backgroundColor: getCellColor(cell.similarity),
                    opacity: isHovered ? 1 : 0.85,
                    color: "white",
                    transform: isHovered ? "scale(1.02)" : "scale(1)",
                  }}
                  onMouseEnter={() => setHoveredCell(cell.id)}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => onSelectMatch?.(index)}
                >
                  {cell.width > 12 && cell.height > 12 && (
                    <span className="truncate px-1 text-white/90">{cell.domain}</span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredCell && (() => {
            const cell = cells.find((c) => c.id === hoveredCell);
            if (!cell) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="mt-3 p-3 rounded-lg bg-muted/50 border text-sm"
              >
                <div className="font-semibold text-foreground">{cell.domain}</div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Similarity: <span className="font-mono font-bold text-foreground">{cell.similarity}%</span></span>
                  <span>Words: <span className="font-mono font-bold text-foreground">{cell.words}</span></span>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-1 justify-center">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">Similarity:</span>
          <div className="flex items-center gap-0.5">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: getCellColor(30) }} />
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: getCellColor(55) }} />
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: getCellColor(75) }} />
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: getCellColor(95) }} />
          </div>
          <span className="text-[10px] text-muted-foreground ml-1">Low → High</span>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, FileText, Link, AlertTriangle } from "lucide-react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { RiskLevel } from "@/components/ui/risk-badge";
import { AnimatedScoreGauge } from "@/components/reports/animated-score-gauge";

interface HeroScorePanelProps {
  originalityScore: number;
  wordCount: number;
  matchCount: number;
  riskLevel: RiskLevel;
  summary?: string;
}

export function HeroScorePanel({
  originalityScore,
  wordCount,
  matchCount,
  riskLevel,
  summary,
}: HeroScorePanelProps) {
  const riskGradient =
    originalityScore >= 90
      ? "from-emerald-500/5 via-transparent to-transparent"
      : originalityScore >= 70
        ? "from-amber-500/5 via-transparent to-transparent"
        : "from-destructive/5 via-transparent to-transparent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full mb-10 rounded-2xl border border-muted/60 overflow-hidden"
    >
      {/* Animated background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${riskGradient} bg-[length:200%_200%] animate-gradient-shift pointer-events-none`}
      />

      {/* Subtle border glow */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/[0.03] pointer-events-none" />

      <div className="relative p-6 md:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: Gauge */}
          <div className="shrink-0 flex justify-center">
            <AnimatedScoreGauge score={originalityScore} size={260} />
          </div>

          {/* Right: Key insights */}
          <div className="flex-1 flex flex-col items-start gap-5">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold tracking-tight">Analysis Results</h2>
              <RiskBadge risk={riskLevel} />
            </div>

            {summary && (
              <p className="text-sm leading-relaxed text-muted-foreground max-w-lg">
                {summary}
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-mono text-lg font-bold tracking-tight">{wordCount.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Words Analyzed</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Link className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-mono text-lg font-bold tracking-tight">{matchCount}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Sources Found</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 col-span-2 sm:col-span-1">
                {originalityScore >= 90 ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <div>
                  <div className="font-mono text-lg font-bold tracking-tight">
                    {originalityScore >= 90 ? "Excellent" : originalityScore >= 70 ? "Fair" : "Critical"}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Quality Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

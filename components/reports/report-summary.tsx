"use client";

import { useRef } from "react";
import { motion, Variants, useMotionValue, useTransform } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Link
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskLevel } from "@/components/ui/risk-badge";

interface ReportSummaryProps {
  originalityScore: number;
  wordCount: number;
  matchCount: number;
  riskLevel: RiskLevel;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function getScoreColors(score: number) {
  if (score >= 90) return {
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    accent: "from-emerald-500/20",
  };
  if (score >= 70) return {
    text: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    accent: "from-amber-500/20",
  };
  return {
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    accent: "from-destructive/20",
  };
}

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [3, -3]);
  const rotateY = useTransform(x, [-100, 100], [-3, 3]);

  function handleMouse(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      className={cn("will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}

export function ReportSummary({ originalityScore, wordCount, matchCount, riskLevel }: ReportSummaryProps) {
  const scoreColors = getScoreColors(originalityScore);

  const metrics = [
    {
      title: "Originality Score",
      value: `${originalityScore}%`,
      description: originalityScore > 80 ? "Highly original content" : "Significant matches found",
      icon: ShieldCheck,
      color: scoreColors.text,
      bgColor: scoreColors.bg,
      accentGradient: scoreColors.accent,
      badge: originalityScore === 100 ? "Perfect" : undefined
    },
    {
      title: "Risk Level",
      value: `${riskLevel} Risk`,
      description: riskLevel === "Low" ? "No significant issues found" : "Requires review",
      icon: AlertTriangle,
      color: riskLevel === "High" ? "text-destructive" : riskLevel === "Medium" ? "text-amber-500" : "text-emerald-500",
      bgColor: riskLevel === "High" ? "bg-destructive/10" : riskLevel === "Medium" ? "bg-amber-500/10" : "bg-emerald-500/10",
      accentGradient: riskLevel === "High" ? "from-destructive/20" : riskLevel === "Medium" ? "from-amber-500/20" : "from-emerald-500/20",
    },
    {
      title: "Total Words",
      value: wordCount.toLocaleString(),
      description: "Length of document",
      icon: FileText,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      accentGradient: "from-indigo-500/20",
    },
    {
      title: "Sources Found",
      value: matchCount.toString(),
      description: matchCount === 0 ? "No matches detected" : "Internet matches detected",
      icon: Link,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      accentGradient: "from-amber-500/20",
    },
  ];

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <h2 className="font-display text-2xl font-bold tracking-tight">Executive Summary</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          A high-level overview of the document&apos;s analysis results and metrics.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div key={i} variants={itemVariants}>
              <TiltCard>
                <Card className={cn(
                  "h-full overflow-hidden relative group cursor-default border-muted/60 shadow-sm hover:shadow-lg transition-all duration-300 bg-card/80 backdrop-blur-sm"
                )}>
                  {/* Top accent line */}
                  <div className={cn("absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500", metric.accentGradient)} />

                  <CardContent className="p-5 flex flex-col justify-between h-full relative">
                    {/* Shimmer effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent animate-shimmer" />
                    </div>

                    <div className="flex justify-between items-start mb-4 relative">
                      <div className={cn(
                        "p-2.5 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-[360deg]",
                        metric.bgColor,
                        metric.color
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {metric.badge && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold tracking-wider border-0">
                          {metric.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <h3 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-widest mb-1">{metric.title}</h3>
                      <div className="font-mono text-3xl font-bold tracking-tighter text-foreground mb-1">{metric.value}</div>
                      <p className="text-xs text-muted-foreground">{metric.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </TiltCard>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

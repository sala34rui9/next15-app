"use client";

import { motion, Variants } from "framer-motion";
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

export function ReportSummary({ originalityScore, wordCount, matchCount, riskLevel }: ReportSummaryProps) {
  // Dynamically build metrics based on props
  const metrics = [
    {
      title: "Originality Score",
      value: `${originalityScore}%`,
      description: originalityScore > 80 ? "Highly original content" : "Significant matches found",
      icon: ShieldCheck,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      badge: originalityScore === 100 ? "Perfect" : undefined
    },
    {
      title: "Risk Level",
      value: `${riskLevel} Risk`,
      description: riskLevel === "Low" ? "No significant issues found" : "Requires review",
      icon: AlertTriangle,
      color: riskLevel === "High" ? "text-destructive" : riskLevel === "Medium" ? "text-amber-500" : "text-blue-500",
      bgColor: riskLevel === "High" ? "bg-destructive/10" : riskLevel === "Medium" ? "bg-amber-500/10" : "bg-blue-500/10",
    },
    {
      title: "Total Words",
      value: wordCount.toLocaleString(),
      description: "Length of document",
      icon: FileText,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "Sources Found",
      value: matchCount.toString(),
      description: matchCount === 0 ? "No matches detected" : "Internet matches detected",
      icon: Link,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Executive Summary</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          A high-level overview of the document's analysis results and metrics.
        </p>
      </div>

      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div key={i} variants={itemVariants}>
              <Card className="h-full border-muted/60 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden relative group">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-2.5 rounded-xl transition-colors duration-300 group-hover:bg-opacity-80", metric.bgColor, metric.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {metric.badge && (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                        {metric.badge}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="text-muted-foreground text-sm font-medium mb-1">{metric.title}</h3>
                    <div className="text-2xl font-bold tracking-tight text-foreground mb-1">{metric.value}</div>
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  </div>
                </CardContent>
                {/* Subtle gradient hover effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

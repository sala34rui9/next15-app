"use client";

import { useMemo } from "react";
import { motion, Variants } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ShieldCheck, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatedScoreGauge } from "@/components/reports/animated-score-gauge";
import { MatchDetail } from "@/services/quetext/quetext.types";

interface ReportChartsProps {
  originalityScore: number;
  matches: MatchDetail[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    }
  }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 border border-border backdrop-blur-sm p-3 rounded-lg shadow-lg text-sm">
        <p className="font-display font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function ReportCharts({ originalityScore, matches }: ReportChartsProps) {

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    matches.forEach(m => {
      let domain = "Unknown";
      if (m.sourceUrl) {
        try {
          domain = new URL(m.sourceUrl).hostname.replace('www.', '');
        } catch {
          domain = m.sourceName || "Unknown";
        }
      } else if (m.sourceName) {
        domain = m.sourceName;
      }
      counts[domain] = (counts[domain] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, matches: count }))
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 5);

    const colors = [
      "var(--risk-high)",
      "var(--risk-medium)",
      "var(--risk-low)",
      "oklch(0.6 0.15 250)",
      "oklch(0.55 0.15 320)",
    ];

    return sorted.map((item, index) => ({
      ...item,
      fill: colors[index % colors.length]
    }));
  }, [matches]);

  const similarityData = useMemo(() => {
    let exact = 0;
    let slight = 0;
    let paraphrased = 0;

    matches.forEach(m => {
      if (m.similarityScore >= 95) exact++;
      else if (m.similarityScore >= 80) slight++;
      else paraphrased++;
    });

    return [
      { name: "Exact Match", value: exact, fill: "var(--risk-high)" },
      { name: "Slight Changes", value: slight, fill: "var(--risk-medium)" },
      { name: "Paraphrased", value: paraphrased, fill: "var(--risk-low)" },
    ];
  }, [matches]);


  return (
    <div className="w-full mt-12 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <h2 className="font-display text-2xl font-bold tracking-tight">Analysis Breakdown</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Deep visual insights into the composition of your document.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {/* Gauge: spans 2 columns */}
        <motion.div variants={cardVariants} className="lg:col-span-2">
          <Card className="h-full border-muted/60 shadow-sm overflow-hidden flex flex-col bg-card/80 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--risk-low)] via-[var(--risk-medium)] to-[var(--risk-high)] opacity-60" />
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-semibold uppercase tracking-wider">Content Originality</CardTitle>
              <CardDescription>Overall originality score of your document</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center pb-8">
              <AnimatedScoreGauge score={originalityScore} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Similarity Type: 1 column */}
        <motion.div variants={cardVariants}>
          <Card className="h-full border-muted/60 shadow-sm overflow-hidden flex flex-col bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-semibold uppercase tracking-wider">Similarity Type</CardTitle>
              <CardDescription>Categorization of flagged text</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {matches.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-center p-4">
                  <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No Similar Matches</p>
                  <p className="text-xs text-muted-foreground mt-1">All content appears original</p>
                </div>
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={similarityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <Tooltip cursor={{ fill: 'var(--muted)' }} content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36} animationDuration={1500}>
                        {similarityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Source Distribution: full width below */}
        <motion.div variants={cardVariants} className="lg:col-span-3">
          <Card className="h-full border-muted/60 shadow-sm overflow-hidden flex flex-col bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-semibold uppercase tracking-wider">Source Distribution</CardTitle>
              <CardDescription>Top platforms where matched text was found</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {sourceData.length === 0 ? (
                <div className="h-[240px] flex flex-col items-center justify-center text-center p-4">
                  <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
                    <Search className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No Sources Detected</p>
                  <p className="text-xs text-muted-foreground mt-1">Your document has no internet matches</p>
                </div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} width={130} />
                      <Tooltip cursor={{ fill: 'var(--muted)' }} content={<CustomTooltip />} />
                      <Bar dataKey="matches" radius={[0, 4, 4, 0]} barSize={22} animationDuration={1500}>
                        {sourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}

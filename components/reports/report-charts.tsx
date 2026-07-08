"use client";

import { useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

// Custom tooltip styles to match SaaS aesthetic
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 border border-border backdrop-blur-sm p-3 rounded-lg shadow-lg text-sm">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function ReportCharts({ originalityScore, matches }: ReportChartsProps) {

  // 1. Original vs Matched Donut Chart
  const originalityData = useMemo(() => [
    { name: "Original Content", value: originalityScore, color: "hsl(var(--primary))" },
    { name: "Matched Content", value: 100 - originalityScore, color: "hsl(var(--destructive))" },
  ], [originalityScore]);

  // 2. Source Distribution (Bar Chart)
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
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, matches: count }))
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 5); // Top 5
  }, [matches]);

  // 3. Similarity Breakdown (Bar Chart)
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
      { name: "Exact Match", value: exact },
      { name: "Slight Changes", value: slight },
      { name: "Paraphrased", value: paraphrased },
    ];
  }, [matches]);


  return (
    <div className="w-full mt-12 mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Analysis Breakdown</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Deep visual insights into the composition of your document.
        </p>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Chart 1: Originality Donut */}
        <motion.div variants={cardVariants}>
          <Card className="h-full border-muted/60 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Content Composition</CardTitle>
              <CardDescription>Breakdown of original vs matched text</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={originalityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    {originalityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chart 2: Source Distribution */}
        <motion.div variants={cardVariants}>
          <Card className="h-full border-muted/60 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Source Distribution</CardTitle>
              <CardDescription>Top platforms where matched text was found</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={120} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} content={<CustomTooltip />} />
                  <Bar dataKey="matches" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={24} animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chart 3: Similarity Breakdown */}
        <motion.div variants={cardVariants}>
          <Card className="h-full border-muted/60 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Similarity Type</CardTitle>
              <CardDescription>Categorization of the flagged text</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={similarityData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.2)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} barSize={40} animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, FileText, Activity, AlertTriangle, Loader2 } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

interface HistoryRecord {
  id: string;
  created_at: string;
  score: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
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
          const json = await res.json();
          if (Array.isArray(json)) {
            setData(json);
          }
        }
      } catch (error) {
        console.error("Failed to load analytics data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    
    const totalScans = data.length;
    const avgScore = data.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalScans;
    
    const highRisk = data.filter(d => (d.score || 0) < 50).length;
    const mediumRisk = data.filter(d => (d.score || 0) >= 50 && (d.score || 0) < 80).length;
    const lowRisk = data.filter(d => (d.score || 0) >= 80).length;

    return { totalScans, avgScore: Math.round(avgScore), highRisk, mediumRisk, lowRisk };
  }, [data]);

  const timeSeriesData = useMemo(() => {
    // Group by Date (YYYY-MM-DD)
    const grouped = data.reduce((acc: any, curr) => {
      const date = new Date(curr.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!acc[date]) {
        acc[date] = { date, scans: 0, avgScore: 0, _totalScore: 0 };
      }
      acc[date].scans += 1;
      acc[date]._totalScore += (curr.score || 0);
      acc[date].avgScore = Math.round(acc[date]._totalScore / acc[date].scans);
      return acc;
    }, {});
    
    // Sort chronologically (oldest first for proper x-axis order)
    return Object.values(grouped).sort((a: any, b: any) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [data]);

  const riskData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Low Risk (>80%)", value: stats.lowRisk, color: "#10b981" },
      { name: "Medium Risk (50-80%)", value: stats.mediumRisk, color: "#f59e0b" },
      { name: "High Risk (<50%)", value: stats.highRisk, color: "#ef4444" },
    ].filter(d => d.value > 0);
  }, [stats]);

  if (loading) {
    return (
      <Container className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading analytics data...</p>
        </div>
      </Container>
    );
  }

  if (data.length === 0) {
    return (
      <Container>
        <PageHeader title="Analytics" description="Platform usage and statistics." />
        <Section className="pt-0">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="p-4 rounded-full bg-muted">
                <BarChart className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No data available</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Run some plagiarism scans to start generating analytics.
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader 
        title="Analytics Dashboard" 
        description="Comprehensive insights into your plagiarism checks."
      />
      <Section className="pt-0 space-y-6">
        
        {/* Top KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalScans}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime reports generated
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Originality</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.avgScore}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all your documents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Reports</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.highRisk}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Scoring below 50% originality
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Safe Reports</CardTitle>
              <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.lowRisk}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Scoring above 80% originality
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-7">
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle>Scans Over Time</CardTitle>
              <CardDescription>Daily volume of plagiarism checks</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="scans" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorScans)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
              <CardDescription>Breakdown by originality score</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

      </Section>
    </Container>
  );
}

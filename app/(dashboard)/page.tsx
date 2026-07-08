"use client"

import { PageHeader } from "@/components/layout/page-header"
import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, ScanSearch, FileText, Activity, Coins, Target, History } from "lucide-react"
import { motion, Variants } from "framer-motion"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
}

const stats = [
  {
    title: "Total Scans",
    value: "1,284",
    change: "+12.5% from last month",
    icon: ScanSearch,
  },
  {
    title: "Words Processed",
    value: "2.4M",
    change: "+18.2% from last month",
    icon: FileText,
  },
  {
    title: "API Usage",
    value: "84%",
    change: "142k / 170k requests",
    icon: Activity,
  },
  {
    title: "Remaining Credits",
    value: "45,200",
    change: "Renews in 12 days",
    icon: Coins,
  },
  {
    title: "Avg Originality Score",
    value: "92%",
    change: "+2% from last week",
    icon: Target,
  },
]

const recentActivity = [
  { id: 1, action: "Deep Scan completed", target: "Q3_Report_Final.pdf", time: "10 mins ago", status: "Clean" },
  { id: 2, action: "API Key Generated", target: "Production Key", time: "2 hours ago", status: "Success" },
  { id: 3, action: "Deep Scan completed", target: "employee_handbook.docx", time: "4 hours ago", status: "Clean" },
  { id: 4, action: "Subscription Updated", target: "Enterprise Tier", time: "1 day ago", status: "Success" },
  { id: 5, action: "Deep Scan failed", target: "corrupted_file.zip", time: "2 days ago", status: "Error" },
]

export default function DashboardPage() {
  return (
    <Container>
      <PageHeader 
        title="Dashboard" 
        description="Overview of your workspace, API usage, and scan metrics."
        actions={
          <Button>
            <Download className="mr-2 h-4 w-4" /> Download Report
          </Button>
        }
      />
      <Section className="pt-0">
        <motion.div 
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {stats.map((stat, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card className="h-full overflow-hidden transition-colors hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
        
        <motion.div 
          className="mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 24 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Recent Activity</CardTitle>
              </div>
              <CardDescription>Your latest scans and workspace events.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.target}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                        activity.status === 'Clean' || activity.status === 'Success' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {activity.status}
                      </span>
                      <div className="text-sm text-muted-foreground tabular-nums w-20 text-right">
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Section>
    </Container>
  )
}

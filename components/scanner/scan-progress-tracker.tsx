"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, FileText, Search, Combine, FileSignature, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ScanProgressTrackerProps {
  progress: number;
  status: "pending" | "processing" | "completed" | "failed";
}

const STAGES = [
  { id: "uploading", label: "Uploading Document", icon: FileText, threshold: 0 },
  { id: "analysis", label: "DeepSearch Analysis", icon: Search, threshold: 10 },
  { id: "comparing", label: "Comparing Sources", icon: Combine, threshold: 40 },
  { id: "report", label: "Generating Report", icon: FileSignature, threshold: 70 },
  { id: "finalizing", label: "Finalizing Results", icon: Sparkles, threshold: 95 },
];

export function ScanProgressTracker({ progress, status }: ScanProgressTrackerProps) {
  // Determine the current active stage based on progress
  let activeStageIndex = 0;
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (progress >= STAGES[i].threshold) {
      activeStageIndex = i;
      break;
    }
  }

  // If completed, force all to be done
  if (status === "completed" || progress >= 100) {
    activeStageIndex = STAGES.length; 
  }

  // Rough estimation of time remaining (assuming 1% = 0.5s for fake UX, but capping to a string)
  const timeRemainingSeconds = Math.max(0, Math.floor((100 - progress) * 0.5));
  const timeRemainingString = timeRemainingSeconds > 60 
    ? `~${Math.ceil(timeRemainingSeconds / 60)} minutes remaining` 
    : timeRemainingSeconds > 0 
      ? `~${timeRemainingSeconds} seconds remaining`
      : "Almost there...";

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm border-muted/60 overflow-hidden">
      <div className="bg-muted/30 border-b px-8 py-6">
        <h2 className="text-xl font-semibold mb-2">Analysis in Progress</h2>
        <p className="text-sm text-muted-foreground">
          We are scanning your document against billions of sources. You can safely navigate away, and we'll notify you when it's done.
        </p>
      </div>

      <CardContent className="p-8">
        <div className="mb-10">
          <div className="flex justify-between text-sm font-medium mb-3">
            <span className="text-primary">{progress}% Complete</span>
            <span className="text-muted-foreground">{status === "completed" ? "Done" : timeRemainingString}</span>
          </div>
          <Progress value={progress} className="h-3 bg-muted" />
        </div>

        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
          {STAGES.map((stage, index) => {
            const isCompleted = index < activeStageIndex || status === "completed";
            const isActive = index === activeStageIndex && status !== "completed" && status !== "failed";
            const isPending = index > activeStageIndex && status !== "completed";
            
            const Icon = stage.icon;

            return (
              <motion.div 
                key={stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
              >
                {/* Icon Circle */}
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full shrink-0 border-4 border-background z-10 transition-colors duration-500",
                  isCompleted ? "bg-emerald-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] px-4">
                  <motion.div
                    animate={{
                      scale: isActive ? 1.05 : 1,
                      opacity: isPending ? 0.5 : 1,
                    }}
                    className={cn(
                      "p-4 rounded-xl border transition-all duration-300",
                      isActive ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isCompleted ? "bg-emerald-500/10 text-emerald-500" : isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={cn(
                        "font-medium text-sm",
                        isActive ? "text-primary font-semibold" : "text-foreground"
                      )}>
                        {stage.label}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {status === "failed" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-4 bg-destructive/10 text-destructive rounded-xl text-center border border-destructive/20"
          >
            <h3 className="font-semibold mb-1">Analysis Failed</h3>
            <p className="text-sm">We encountered an error while processing your document. Please try again.</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

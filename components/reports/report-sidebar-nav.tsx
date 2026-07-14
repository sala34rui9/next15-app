"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BarChart3, FileSearch, GitCompare, Table2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { DownloadReportButton } from "@/components/reports/download-report-button";

interface ReportSidebarNavProps {
  originalityScore: number;
  jobId: string;
}

const NAV_ITEMS = [
  { id: "hero", label: "Overview", icon: BarChart3 },
  { id: "summary", label: "Summary", icon: FileSearch },
  { id: "charts", label: "Breakdown", icon: BarChart3 },
  { id: "findings", label: "Findings", icon: GitCompare },
  { id: "sources", label: "Sources", icon: Table2 },
];

export function ReportSidebarNav({ originalityScore, jobId }: ReportSidebarNavProps) {
  const [activeId, setActiveId] = useState("hero");

  const handleScroll = useCallback(() => {
    const sections = NAV_ITEMS.map((item) => ({
      id: item.id,
      el: document.getElementById(`report-section-${item.id}`),
    }));

    const scrollY = window.scrollY + 120;

    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      if (section.el && section.el.offsetTop <= scrollY) {
        setActiveId(section.id);
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`report-section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-20 h-[calc(100vh-5rem)]">
      <nav className="flex-1 py-4">
        {/* Nav items */}
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => scrollTo(item.id)}
                  className={cn(
                    "relative flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Export button at bottom */}
      <div className="pt-4 border-t border-border">
        <DownloadReportButton jobId={jobId} />
      </div>
    </aside>
  );
}

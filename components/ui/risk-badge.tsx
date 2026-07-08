import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RiskLevel = "High" | "Medium" | "Low";

interface RiskBadgeProps {
  risk: RiskLevel;
  className?: string;
  showText?: boolean;
}

export function RiskBadge({ risk, className, showText = true }: RiskBadgeProps) {
  switch (risk) {
    case "High":
      return (
        <Badge variant="destructive" className={cn("flex w-fit items-center gap-1", className)}>
          <ShieldAlert className="w-3 h-3" />
          {showText && "High"}
        </Badge>
      );
    case "Medium":
      return (
        <Badge variant="outline" className={cn("text-amber-500 border-amber-500/30 bg-amber-500/10 flex w-fit items-center gap-1", className)}>
          <Shield className="w-3 h-3" />
          {showText && "Medium"}
        </Badge>
      );
    case "Low":
      return (
        <Badge variant="outline" className={cn("text-emerald-500 border-emerald-500/30 bg-emerald-500/10 flex w-fit items-center gap-1", className)}>
          <ShieldCheck className="w-3 h-3" />
          {showText && "Low"}
        </Badge>
      );
    default:
      return null;
  }
}

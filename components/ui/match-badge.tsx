import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type MatchType = "Exact Match" | "Paraphrased" | "Slight Changes";

interface MatchBadgeProps {
  type: MatchType;
  className?: string;
}

export function MatchBadge({ type, className }: MatchBadgeProps) {
  switch (type) {
    case "Exact Match":
      return (
        <Badge variant="secondary" className={cn("bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent", className)}>
          Exact
        </Badge>
      );
    case "Slight Changes":
      return (
        <Badge variant="secondary" className={cn("bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-transparent", className)}>
          Slight
        </Badge>
      );
    case "Paraphrased":
      return (
        <Badge variant="secondary" className={cn("bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-transparent", className)}>
          Paraphrased
        </Badge>
      );
    default:
      return null;
  }
}

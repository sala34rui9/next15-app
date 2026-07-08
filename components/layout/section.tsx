import { cn } from "@/lib/utils"
import React from "react"

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType
}

export function Section({
  className,
  as: Component = "section",
  ...props
}: SectionProps) {
  return (
    <Component
      className={cn("py-8 md:py-12 lg:py-16", className)}
      {...props}
    />
  )
}

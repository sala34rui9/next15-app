import { cn } from "@/lib/utils"
import React from "react"
import { Flex } from "./flex"

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <Flex
      direction="col"
      gap="4"
      className={cn("pb-8 pt-4 md:pt-6", className)}
      {...props}
    >
      <Flex direction="row" align="start" justify="between" className="w-full gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </Flex>
    </Flex>
  )
}

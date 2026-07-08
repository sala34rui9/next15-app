import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";

export default function HistoryLoading() {
  return (
    <Container>
      <PageHeader 
        title="Scan History" 
        description="View and manage all your past plagiarism reports." 
      />
      
      <Section className="pt-0">
        <div className="rounded-xl border bg-card text-card-foreground shadow w-full">
          <div className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10">
            <Skeleton className="h-10 w-full sm:max-w-sm rounded-md" />
            <Skeleton className="h-4 w-32" />
          </div>
          
          <div className="p-0">
            {/* Table Header Skeleton */}
            <div className="flex bg-muted/30 p-4 border-b">
              <Skeleton className="h-4 w-32 mr-auto" />
              <Skeleton className="h-4 w-24 mx-4" />
              <Skeleton className="h-4 w-20 mx-4 hidden md:block" />
              <Skeleton className="h-4 w-24 mx-4" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>

            {/* Table Rows Skeleton */}
            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center p-4">
                  <div className="flex items-center gap-3 mr-auto min-w-[200px]">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-24 mx-4 hidden sm:block" />
                  <Skeleton className="h-4 w-16 mx-4 hidden md:block" />
                  <div className="mx-4 flex items-center gap-2">
                    <Skeleton className="h-2 w-12 rounded-full hidden sm:block" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="h-6 w-24 ml-auto rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </Container>
  );
}

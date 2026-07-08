import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";

export default function ReportLoading() {
  return (
    <Container>
      <PageHeader 
        title="Analyzing Document..." 
        description="We are generating your detailed report. This may take a few seconds." 
      />
      
      {/* Summary Grid Skeleton */}
      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div className="p-6 pt-0">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Charts Skeleton */}
      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="rounded-xl border bg-card text-card-foreground shadow col-span-4 p-6">
            <Skeleton className="h-6 w-32 mb-6" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow col-span-3 p-6">
            <Skeleton className="h-6 w-32 mb-6" />
            <Skeleton className="h-[300px] w-full rounded-full max-w-[300px] mx-auto" />
          </div>
        </div>
      </Section>
      
      {/* Table Skeleton */}
      <Section className="pt-0 pb-16">
        <div className="rounded-xl border bg-card text-card-foreground shadow w-full">
          <div className="p-6 border-b flex justify-between items-center">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-72 rounded-md" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[100px] ml-auto" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </Section>
    </Container>
  );
}

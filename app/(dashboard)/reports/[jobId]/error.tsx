"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Report Error Boundary Caught:", error);
  }, [error]);

  return (
    <Container className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center justify-center space-y-6 max-w-md text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Failed to Load Report</h2>
          <p className="text-muted-foreground">
            We couldn't retrieve the plagiarism analysis. The report might have been deleted, or there was a server error.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button 
            onClick={() => reset()} 
            variant="default"
            className="w-full sm:w-auto"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button 
            onClick={() => router.push('/history')} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to History
          </Button>
        </div>
      </div>
    </Container>
  );
}

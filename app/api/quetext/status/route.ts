import { NextRequest, NextResponse } from "next/server";
import { QuetextService } from "@/services/quetext/quetext.service";
import { logger } from "@/utils/logger";
import { QuetextApiError } from "@/services/quetext/quetext.types";

function getClient(req: NextRequest): QuetextService {
  const apiKey = req.headers.get("x-quetext-key") || process.env.QUETEXT_API_KEY || "";
  const baseUrl = req.headers.get("x-quetext-base-url") || process.env.QUETEXT_BASE_URL || "";
  return new QuetextService({ apiKey, baseUrl });
}

export async function GET(req: NextRequest) {
  try {
    const client = getClient(req);
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId parameter" },
        { status: 400 }
      );
    }

    const rawStatus = await client.checkStatus(jobId);
    
    // Quetext returns progress as a fraction (0.0 to 1.0). 1 means completed.
    const progressValue = rawStatus.progress ?? 0;
    const isCompleted = progressValue === 1;
    const mappedStatus = isCompleted ? "completed" : "processing";
    const progressPercentage = Math.round(progressValue * 100);

    const statusResponse = {
      jobId,
      status: mappedStatus,
      progressPercentage,
    };

    // If the job is completed, we can also fetch the final report and return it together
    if (isCompleted) {
      const reportResponse = await client.fetchReport(jobId);
      return NextResponse.json({
        ...statusResponse,
        report: reportResponse,
      });
    }

    return NextResponse.json(statusResponse);
  } catch (error) {
    if (error instanceof QuetextApiError) {
      return NextResponse.json(
        { error: error.message, details: error.responseBody },
        { status: error.statusCode || 500 }
      );
    }
    
    logger.error(`Failed to check status`, error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

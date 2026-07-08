import { NextRequest, NextResponse } from "next/server";
import { QuetextService } from "@/services/quetext/quetext.service";
import { logger } from "@/utils/logger";
import { QuetextApiError } from "@/services/quetext/quetext.types";

function getClient(req: NextRequest): QuetextService {
  const headerKey = req.headers.get("x-quetext-key")?.trim();
  const envKey = process.env.QUETEXT_API_KEY?.trim();
  const apiKey = headerKey || envKey || "";
  
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

    const reportResponse = await client.fetchReport(jobId);
    logger.info(`Report route returning for ${jobId}: originality=${reportResponse.originalityScore}%, words=${reportResponse.wordCount}, matches=${reportResponse.matches?.length ?? 0}`);
    return NextResponse.json(reportResponse);
  } catch (error) {
    if (error instanceof QuetextApiError) {
      return NextResponse.json(
        { error: error.message, details: error.responseBody },
        { status: error.statusCode || 500 }
      );
    }
    
    logger.error(`Failed to fetch report`, error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

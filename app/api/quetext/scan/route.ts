import { NextRequest, NextResponse } from "next/server";
import { QuetextService } from "@/services/quetext/quetext.service";
import { logger } from "@/utils/logger";
import { QuetextApiError } from "@/services/quetext/quetext.types";

function getClient(req: NextRequest): QuetextService {
  const headerKey = req.headers.get("x-quetext-key")?.trim();
  const envKey = process.env.QUETEXT_API_KEY?.trim();
  const apiKey = headerKey || envKey || "";
  
  const baseUrl = req.headers.get("x-quetext-base-url") || process.env.QUETEXT_BASE_URL || "";
  
  logger.info(`Creating QuetextService. Key source: ${headerKey ? "header" : envKey ? "env" : "none"}. Base URL: ${baseUrl}`);
  
  return new QuetextService({ apiKey, baseUrl });
}

export async function POST(req: NextRequest) {
  try {
    const client = getClient(req);
    const formData = await req.formData();
    
    const text = formData.get("text") as string | null;
    const file = formData.get("file") as File | null;
    
    if (!text && !file) {
      return NextResponse.json(
        { error: "Must provide either text or file" },
        { status: 400 }
      );
    }

    const response = await client.submitDocument({
      text: text || undefined,
      file: file || undefined,
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof QuetextApiError) {
      return NextResponse.json(
        { error: error.message, details: error.responseBody },
        { status: error.statusCode || 500 }
      );
    }
    
    logger.error("Failed to process scan request", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

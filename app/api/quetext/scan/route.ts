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
    // Enforce a reasonable body size limit (Next.js default is 1MB for Server Actions,
    // but route handlers may receive larger bodies; we cap text at 500KB).
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Request body too large (max 10MB)" },
        { status: 413 }
      );
    }

    const formData = await req.formData();

    const text = formData.get("text") as string | null;
    const file = formData.get("file") as File | null;

    if (!text && !file) {
      return NextResponse.json(
        { error: "Must provide either text or file" },
        { status: 400 }
      );
    }

    if (text && text.length > 500_000) {
      return NextResponse.json(
        { error: "Text too large (max 500,000 characters)" },
        { status: 413 }
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

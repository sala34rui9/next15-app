import { logger } from "@/utils/logger";
import {
  QuetextConfig,
  SubmitDocumentRequest,
  SubmitDocumentResponse,
  CheckStatusResponse,
  FetchReportResponse,
  MatchDetail,
  QuetextApiError,
  QuetextRawReportData,
  QuetextRawSource,
} from "./quetext.types";

export class QuetextService {
  private config: QuetextConfig;

  constructor(config: QuetextConfig) {
    if (!config.apiKey) {
      logger.error("QuetextService initialized without an API key.");
    }
    
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || "https://www.quetext.com/api",
    };
  }

  /**
   * Helper method to standardize fetch calls with authentication and error handling
   */
  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers = new Headers(options.headers);
    headers.set("x-api-key", this.config.apiKey);
    
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      logger.debug(`Quetext Request: ${options.method || "GET"} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      let responseBody: any;
      const responseText = await response.text();
      try {
        responseBody = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseBody = responseText;
      }

      if (!response.ok) {
        if (response.status === 402 && responseBody?.data) {
          throw new QuetextApiError("Insufficient API Credits", 402, responseBody, responseBody.data);
        }
        throw new QuetextApiError(`Request failed with status ${response.status}`, response.status, responseBody);
      }

      // Check for upstream V2 errors hidden in HTTP 200
      if (responseBody?.code === 500) {
         throw new QuetextApiError("Quetext Upstream Error", 500, responseBody);
      }
      
      // If Quetext explicitly returns status: false with a 200 OK
      if (responseBody && responseBody.status === false) {
         throw new QuetextApiError(
           responseBody.message || "Quetext API Error", 
           responseBody.code || 400, 
           responseBody
         );
      }

      // V2 API returns { status: true, data: T }
      if (responseBody && typeof responseBody.status === "boolean" && responseBody.data) {
        return responseBody.data as T;
      }

      // Fallback in case of unexpected payload
      return responseBody as T;
      
    } catch (error) {
      if (error instanceof QuetextApiError) {
        throw error;
      }
      // Node's fetch throws TypeError with a `cause` containing the real reason
      const cause = (error as any)?.cause;
      const causeMsg = cause ? ` (${cause.code || cause.message || cause})` : "";
      const errorMessage = error instanceof Error ? error.message : "Unknown network error";
      logger.error(`Quetext Fetch Error: ${errorMessage}${causeMsg}`, { endpoint });
      throw new QuetextApiError(`${errorMessage}${causeMsg}`);
    }
  }

  /**
   * Submits a document (text or file) for originality scanning.
   * The V2 API returns { id: string }, which we map to { jobId: string } internally.
   */
  public async submitDocument(request: SubmitDocumentRequest): Promise<SubmitDocumentResponse> {
    logger.info("Submitting document to Quetext API");
    
    let raw: { id: string };

    // Use the appropriate V2 endpoint based on the request type
    if (request.file) {
      const formData = new FormData();
      formData.append("file", request.file);
      if (request.title) formData.append("title", request.title);

      raw = await this.fetchApi<{ id: string }>("/v2/report-file", {
        method: "POST",
        body: formData,
      });
    } else {
      // Default to JSON text payload
      raw = await this.fetchApi<{ id: string }>("/v2/report", {
        method: "POST",
        body: JSON.stringify({
          text: request.text,
        }),
      });
    }

    return {
      jobId: raw.id,
      status: "processing",
    };
  }

  /**
   * Checks the processing status of a submitted document.
   */
  public async checkStatus(jobId: string): Promise<CheckStatusResponse> {
    logger.debug(`Checking status for job: ${jobId}`);
    return this.fetchApi<CheckStatusResponse>(`/v2/report-progress/${jobId}`);
  }

  public async listReports(): Promise<any> {
    logger.info("Fetching reports list from Quetext API");
    return this.fetchApi<any>("/v2/reports");
  }

  /**
   * Fetches the finalized originality report for a completed job.
   * Normalizes the raw Quetext V2 API response (snake_case, undocumented
   * field names) into our typed FetchReportResponse.
   */
  public async fetchReport(jobId: string): Promise<FetchReportResponse> {
    logger.info(`Fetching report for job: ${jobId}`);
    const raw = await this.fetchApi<QuetextRawReportData>(`/v2/report/${jobId}`);

    // Save the raw response to a file for debugging
    try {
      require("fs").writeFileSync(
        "C:\\Users\\abhis\\.gemini\\antigravity\\scratch\\next15-app\\raw_response.json",
        JSON.stringify(raw, null, 2)
      );
    } catch (e) {
      logger.error("Failed to write raw response to file", e as Error);
    }

    // Log the full raw response so we can inspect the actual API shape
    logger.info(`Raw Quetext report response for ${jobId}: ${JSON.stringify(raw)}`);

    return this.normalizeReport(jobId, raw);
  }

  /**
   * Normalizes the raw Quetext V2 report data into our FetchReportResponse.
   * Handles multiple possible field name patterns since the API spec uses
   * `additionalProperties: true` without documenting exact field names.
   */
  private normalizeReport(jobId: string, raw: QuetextRawReportData): FetchReportResponse {
    // --- Plagiarism score → Originality score ---
    // The Quetext API returns a plagiarism `score` (percentage of matched text).
    // The list reports endpoint confirms the field name is `score`.
    // Our UI shows "originality" which is the inverse: 100 - plagiarismScore.
    const plagiarismScore = raw.score ?? 0;
    const originalityScore = Math.max(0, Math.min(100, 100 - plagiarismScore));

    // --- Word count ---
    const wordCount = raw.word_count ?? raw.words ?? 0;

    // --- Matches / Sources ---
    // The API may use "sources", "matches", or "results" as the array key
    const rawSources: QuetextRawSource[] =
      raw.sources ?? raw.matches ?? raw.results ?? [];

    const matches: MatchDetail[] = rawSources.map((s) =>
      this.normalizeSource(s)
    );

    // --- Summary ---
    const summary =
      typeof raw.summary === "string"
        ? raw.summary
        : `Plagiarism analysis complete. ${matches.length} source(s) found with ${plagiarismScore}% matched content.`;

    logger.info(
      `Normalized report ${jobId}: originality=${originalityScore}%, words=${wordCount}, matches=${matches.length}`
    );

    return {
      jobId,
      originalityScore,
      wordCount,
      matches,
      summary,
      raw: raw as any,
    } as any;
  }

  /**
   * Normalizes a single raw source/match entry from the Quetext API
   * into our MatchDetail type, handling multiple possible field names.
   */
  private normalizeSource(s: QuetextRawSource): MatchDetail {
    return {
      sourceUrl: s.url ?? s.source_url ?? s.link ?? undefined,
      sourceName: s.title ?? s.source_name ?? s.name ?? undefined,
      similarityScore: s.similarity ?? s.similarity_score ?? s.score ?? 0,
      matchedText: s.matched_text ?? s.matchedText ?? s.text ?? s.snippet ?? undefined,
    };
  }

  /**
   * Retries a specific request with simple exponential backoff.
   */
  public async retryFailedRequest<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        
        // Don't retry client errors unless it's a rate limit (429)
        if (error instanceof QuetextApiError && error.statusCode) {
          if (error.statusCode < 500 && error.statusCode !== 429) {
            logger.warn(`Aborting retry for client error: ${error.statusCode}`);
            throw error;
          }
        }
        
        if (attempt >= maxRetries) {
          logger.error(`Operation failed after ${maxRetries} attempts.`);
          throw error;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error("Unreachable retry code path");
  }
}

// Instantiate a singleton service using environment variables
export const quetextClient = new QuetextService({
  apiKey: process.env.QUETEXT_API_KEY || "",
  baseUrl: process.env.QUETEXT_BASE_URL || "",
});

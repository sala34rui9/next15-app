export interface QuetextConfig {
  apiKey: string;
  baseUrl: string;
}

export interface SubmitDocumentRequest {
  text?: string;
  file?: File;
  title?: string;
}

export interface SubmitDocumentResponse {
  jobId: string;
  status: "pending" | "processing";
  estimatedTimeSeconds?: number;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface CheckStatusResponse {
  jobId: string;
  status: JobStatus;
  progress?: number;
  progressPercentage?: number;
  message?: string;
  report?: FetchReportResponse;
}

export interface MatchDetail {
  matchedText?: string;
  sourceUrl?: string;
  sourceName?: string;
  similarityScore: number;
}

export interface FetchReportResponse {
  jobId: string;
  originalityScore: number;
  wordCount: number;
  matches: MatchDetail[];
  summary: string;
}

// --- API v2 Specific Types ---

export interface QuetextV2Response<T> {
  status: boolean;
  data: T;
  code?: number;
}

export interface Quetext402Data {
  balance_words: number;
  needed_words: number;
}

export class QuetextApiError extends Error {
  public statusCode?: number;
  public responseBody?: unknown;
  public details?: unknown;

  constructor(message: string, statusCode?: number, responseBody?: unknown, details?: unknown) {
    super(message);
    this.name = "QuetextApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.details = details;
    Object.setPrototypeOf(this, QuetextApiError.prototype);
  }
}

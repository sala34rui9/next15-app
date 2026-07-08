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
  sourceUrl?: string;
  sourceName?: string;
  similarityScore: number;
  matchedText?: string;
  highlightedSnippet?: string;
}

export interface FetchReportResponse {
  jobId: string;
  originalityScore: number;
  wordCount: number;
  matches: MatchDetail[];
  summary?: string;
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

/**
 * Raw report data returned by GET /v2/report/{id}.
 * The Quetext OpenAPI spec declares `additionalProperties: true` without
 * documenting exact field names, so we handle multiple possible shapes.
 * Fields are snake_case as returned by the API.
 */
export interface QuetextRawReportData {
  id?: string;
  score?: number;             // Plagiarism percentage (0–100)
  word_count?: number;        // Total words analyzed
  words?: number;             // Alternate field name for word count
  title?: string;
  created_at?: string;
  // Sources / matches — API may use different field names
  sources?: QuetextRawSource[];
  matches?: QuetextRawSource[];
  results?: QuetextRawSource[];
  // Allow any extra fields we haven't seen yet
  [key: string]: unknown;
}

/**
 * A single matched source from the Quetext report.
 * Handles multiple possible field name patterns.
 */
export interface QuetextRawSource {
  source?: {
    url?: string;
    id?: string;
  };
  input_text_match?: string;
  highlighted_snippet?: string;
  percent_similar?: number;
  url?: string;
  source_url?: string;
  link?: string;
  title?: string;
  source_name?: string;
  name?: string;
  similarity?: number;
  similarity_score?: number;
  score?: number;
  matched_text?: string;
  matchedText?: string;
  text?: string;
  snippet?: string;
  words?: number;
  word_count?: number;
  [key: string]: unknown;
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

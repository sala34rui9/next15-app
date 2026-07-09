import { PDFDocument, PDFPage, PDFFont, RGB, rgb, StandardFonts } from "pdf-lib";
import { FetchReportResponse } from "@/services/quetext/quetext.types";
import { getApiConfig } from "@/utils/api-config";

// ---------------------------------------------------------------------------
// Task 2.1 — Internal TypeScript interfaces
// ---------------------------------------------------------------------------

interface LayoutConstants {
  PAGE_WIDTH: number;    // 595.28
  PAGE_HEIGHT: number;   // 841.89
  MARGIN: number;        // 50
  CONTENT_WIDTH: number; // PAGE_WIDTH - 2 * MARGIN
}

interface ColorPalette {
  primary: RGB;
  text: RGB;
  textMuted: RGB;
  border: RGB;
  bgGray: RGB;
  success: RGB;
  warning: RGB;
  danger: RGB;
  redTint: RGB;   // rgb(0.98, 0.92, 0.92)
  amberTint: RGB; // rgb(0.99, 0.96, 0.88)
}

export interface BrandingConfig {
  appName: string;
  appTagline: string;
  downloadFilename: (jobId: string) => string;
}

interface PdfContext {
  doc: PDFDocument;
  pages: PDFPage[];
  currentPage: PDFPage;
  currentY: number;
  fonts: { regular: PDFFont; bold: PDFFont };
  colors: ColorPalette;
  layout: LayoutConstants;
  branding: BrandingConfig;
  jobId: string;
}

interface DonutSegment {
  startAngle: number;
  endAngle: number;
  color: RGB;
  label: string;
  percentage: number;
}

export interface BarDatum {
  label: string;
  value: number;
  color: RGB;
}

// ---------------------------------------------------------------------------
// Task 2.2 — resolveBranding
// ---------------------------------------------------------------------------

export function resolveBranding(): BrandingConfig {
  const appName =
    (process.env.NEXT_PUBLIC_APP_NAME ?? "").trim() || "Plagiarism Guard";
  const appTagline =
    (process.env.NEXT_PUBLIC_APP_TAGLINE ?? "").trim() ||
    "DETECT \u2022 PROTECT \u2022 VERIFY";
  return {
    appName,
    appTagline,
    downloadFilename: (id: string) => buildFilename(appName, id),
  };
}

// ---------------------------------------------------------------------------
// Task 2.4 — buildFilename (exported)
// ---------------------------------------------------------------------------

export function buildFilename(appName: string, jobId: string): string {
  return appName.toLowerCase().replace(/\s+/g, "-") + "_Report_" + jobId;
}

// ---------------------------------------------------------------------------
// Task 2.6 — stripHtml (exported)
// ---------------------------------------------------------------------------

export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

// ---------------------------------------------------------------------------
// Task 2.8 — truncateText (exported)
// ---------------------------------------------------------------------------

export function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "\u2026";
}

// ---------------------------------------------------------------------------
// Task 2.10 — domainLabel (exported)
// ---------------------------------------------------------------------------

export function domainLabel(m: {
  sourceUrl?: string;
  sourceName?: string;
}): string {
  if (m.sourceUrl) {
    try {
      return new URL(m.sourceUrl).hostname.replace("www.", "");
    } catch {
      // fall through
    }
  }
  if (m.sourceName) return m.sourceName;
  return "Unknown";
}

// ---------------------------------------------------------------------------
// Task 2.12 — getRiskLevel (exported)
// ---------------------------------------------------------------------------

export function getRiskLevel(
  originalityScore: number
): "High" | "Medium" | "Low" {
  if (originalityScore < 50) return "High";
  if (originalityScore < 80) return "Medium";
  return "Low";
}

// ---------------------------------------------------------------------------
// Task 2.13 — getMatchType (exported)
// ---------------------------------------------------------------------------

export function getMatchType(
  similarityScore: number
): "Exact Match" | "Slight Changes" | "Paraphrased" {
  if (similarityScore >= 95) return "Exact Match";
  if (similarityScore >= 80) return "Slight Changes";
  return "Paraphrased";
}

// ---------------------------------------------------------------------------
// Task 4.1 — buildRecommendations (exported)
// ---------------------------------------------------------------------------

export function buildRecommendations(
  originalityScore: number,
  matches: import("@/services/quetext/quetext.types").MatchDetail[]
): string[] {
  const riskLevel = getRiskLevel(originalityScore);
  const recs: string[] = [];

  // Always push one risk-level recommendation
  if (riskLevel === "High") {
    recs.push(
      "Significant plagiarism detected. Review all exact and high-similarity matches and add proper citations."
    );
  } else if (riskLevel === "Medium") {
    recs.push(
      "Moderate similarity detected. Consider rewording paraphrased sections and verify citation formatting."
    );
  } else {
    recs.push(
      "Originality is strong. Perform a final review of any flagged sources before submission."
    );
  }

  // Exact match recommendation
  if (recs.length < 4 && matches.some((m) => m.similarityScore >= 95)) {
    recs.push(
      "Exact matches found \u2014 ensure all quoted material uses proper quotation marks and citations."
    );
  }

  // All-paraphrased recommendation
  if (recs.length < 4 && matches.length > 0 && matches.every((m) => m.similarityScore < 80)) {
    recs.push(
      "All matches are paraphrased. Rewrite flagged sections in your own voice or add attributions."
    );
  }

  return recs.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Task 4.3 — getSimilarityTypeCounts (exported)
// ---------------------------------------------------------------------------

export function getSimilarityTypeCounts(
  matches: import("@/services/quetext/quetext.types").MatchDetail[]
): { exactCount: number; slightCount: number; paraphrasedCount: number } {
  let exactCount = 0;
  let slightCount = 0;
  let paraphrasedCount = 0;

  for (const m of matches) {
    const type = getMatchType(m.similarityScore);
    if (type === "Exact Match") exactCount++;
    else if (type === "Slight Changes") slightCount++;
    else paraphrasedCount++;
  }

  return { exactCount, slightCount, paraphrasedCount };
}

// ---------------------------------------------------------------------------
// Task 4.5 — getSourceChartData (exported)
// ---------------------------------------------------------------------------

export function getSourceChartData(
  matches: import("@/services/quetext/quetext.types").MatchDetail[]
): BarDatum[] {
  const counts: Record<string, number> = {};

  for (const m of matches) {
    const label = domainLabel(m);
    counts[label] = (counts[label] ?? 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({
      label,
      value,
      color: rgb(0.1, 0.4, 0.8),
    }));
}

// ---------------------------------------------------------------------------
// fetchReportData (internal)
// ---------------------------------------------------------------------------

async function fetchReportData(jobId: string): Promise<FetchReportResponse> {
  const apiConfig = getApiConfig();
  const headers: Record<string, string> = {};
  if (apiConfig?.apiKey) headers["x-quetext-key"] = apiConfig.apiKey;
  if (apiConfig?.baseUrl) headers["x-quetext-base-url"] = apiConfig.baseUrl;

  const res = await fetch(`/api/quetext/report?jobId=${jobId}`, { headers });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to fetch report data");
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Task 5 — PdfLayoutEngine class
// ---------------------------------------------------------------------------

export class PdfLayoutEngine {
  doc: PDFDocument;
  pages: PDFPage[];
  currentPage: PDFPage;
  currentY: number;
  fonts: { regular: PDFFont; bold: PDFFont };
  colors: ColorPalette;
  layout: LayoutConstants;
  branding: BrandingConfig;
  jobId: string;

  constructor(params: {
    doc: PDFDocument;
    fonts: { regular: PDFFont; bold: PDFFont };
    colors: ColorPalette;
    layout: LayoutConstants;
    branding: BrandingConfig;
    jobId: string;
    firstPage: PDFPage;
  }) {
    this.doc = params.doc;
    this.fonts = params.fonts;
    this.colors = params.colors;
    this.layout = params.layout;
    this.branding = params.branding;
    this.jobId = params.jobId;
    this.currentPage = params.firstPage;
    this.pages = [params.firstPage];
    this.currentY = params.layout.PAGE_HEIGHT - params.layout.MARGIN;
  }

  checkPageBreak(requiredHeight: number): boolean {
    if (this.currentY - requiredHeight < this.layout.MARGIN) {
      this.addPage();
      return true;
    }
    return false;
  }

  addPage(): void {
    const newPage = this.doc.addPage([this.layout.PAGE_WIDTH, this.layout.PAGE_HEIGHT]);
    this.pages.push(newPage);
    this.currentPage = newPage;
    this.currentY = this.layout.PAGE_HEIGHT - this.layout.MARGIN;
    drawHeader(newPage, this);
    this.currentY -= 60;
  }

  finaliseFooters(): void {
    const total = this.pages.length;
    this.pages.forEach((p, idx) => {
      p.drawText(`Page ${idx + 1} of ${total}`, {
        x: this.layout.PAGE_WIDTH / 2 - 30,
        y: 20,
        size: 9,
        font: this.fonts.regular,
        color: this.colors.textMuted,
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Task 7 — drawHeader
// ---------------------------------------------------------------------------

function drawHeader(page: PDFPage, engine: PdfLayoutEngine): void {
  const { MARGIN, PAGE_WIDTH, PAGE_HEIGHT } = engine.layout;
  const { fonts, colors, branding, jobId } = engine;

  page.drawText(branding.appName, {
    x: MARGIN, y: PAGE_HEIGHT - MARGIN, size: 22, font: fonts.bold, color: colors.primary,
  });
  page.drawText(branding.appTagline, {
    x: MARGIN + 2, y: PAGE_HEIGHT - MARGIN - 16, size: 8, font: fonts.bold, color: colors.textMuted,
  });
  const dateStr = new Date().toLocaleDateString();
  page.drawText(`Date: ${dateStr}`, {
    x: PAGE_WIDTH - MARGIN - 80, y: PAGE_HEIGHT - MARGIN, size: 9, font: fonts.regular, color: colors.textMuted,
  });
  page.drawText(`Report ID: ${jobId}`, {
    x: PAGE_WIDTH - MARGIN - 80, y: PAGE_HEIGHT - MARGIN - 14, size: 8, font: fonts.regular, color: colors.textMuted,
  });
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 28 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 28 },
    thickness: 1, color: colors.border,
  });
}

// ---------------------------------------------------------------------------
// Task 8 — drawExecutiveSummary
// ---------------------------------------------------------------------------

function drawExecutiveSummary(
  engine: PdfLayoutEngine,
  data: {
    originalityScore: number;
    riskLevel: string;
    wordCount: number;
    sourceCount: number;
    summary: string;
  }
): void {
  const { MARGIN, PAGE_WIDTH, CONTENT_WIDTH } = engine.layout;
  const { fonts, colors } = engine;
  const page = engine.currentPage;

  engine.checkPageBreak(160);

  // Report title
  page.drawText("Originality Assessment Report", {
    x: MARGIN, y: engine.currentY, size: 18, font: fonts.bold, color: colors.text,
  });
  engine.currentY -= 20;

  // Summary subtitle
  const subtitleText = data.summary || "Detailed breakdown of matched internet sources and overall originality.";
  page.drawText(subtitleText.slice(0, 90), {
    x: MARGIN, y: engine.currentY, size: 9, font: fonts.regular, color: colors.textMuted,
  });
  engine.currentY -= 25;

  // Summary card background
  const cardHeight = 85;
  page.drawRectangle({
    x: MARGIN, y: engine.currentY - cardHeight, width: CONTENT_WIDTH, height: cardHeight,
    color: colors.bgGray, borderColor: colors.border, borderWidth: 1,
  });

  const metricY = engine.currentY - 28;
  const colWidth = CONTENT_WIDTH / 4;

  const metrics = [
    { label: "Originality", value: `${data.originalityScore}%`, color: colors.success },
    { label: "Risk Level", value: data.riskLevel, color: colors.primary },
    { label: "Total Words", value: data.wordCount.toLocaleString(), color: colors.text },
    { label: "Sources Found", value: String(data.sourceCount), color: colors.warning },
  ];

  metrics.forEach((m, i) => {
    const x = MARGIN + 15 + i * colWidth;
    page.drawText(m.value, { x, y: metricY, size: 20, font: fonts.bold, color: m.color });
    page.drawText(m.label, { x, y: metricY - 18, size: 9, font: fonts.regular, color: colors.textMuted });
  });

  engine.currentY -= cardHeight + 20;
}

// ---------------------------------------------------------------------------
// Task 9 — drawDonutChart
// ---------------------------------------------------------------------------

export function drawDonutChart(engine: PdfLayoutEngine, originalityScore: number): void {
  const { MARGIN, PAGE_WIDTH } = engine.layout;
  const { fonts, colors } = engine;
  const page = engine.currentPage;

  engine.checkPageBreak(220);

  // Section heading
  page.drawText("Content Composition", {
    x: MARGIN, y: engine.currentY, size: 13, font: fonts.bold, color: colors.text,
  });
  engine.currentY -= 5;

  const clampedScore = Math.max(0, Math.min(100, originalityScore));
  const plagiarismScore = 100 - clampedScore;

  const cx = PAGE_WIDTH / 2;
  const cy = engine.currentY - 85;
  const R = 68; // outer radius
  const r = 36; // inner radius (donut hole)

  // Helper: point on circle
  const pt = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  // Draw donut segment as SVG path
  const drawArcSegment = (startAngle: number, endAngle: number, color: RGB) => {
    const sa = startAngle;
    const ea = endAngle;
    const outerStart = pt(sa, R);
    const outerEnd = pt(ea, R);
    const innerStart = pt(ea, r);
    const innerEnd = pt(sa, r);
    const largeArc = (ea - sa) > Math.PI ? 1 : 0;

    const path = [
      `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
      `L ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
      `A ${r} ${r} 0 ${largeArc} 0 ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
      `Z`,
    ].join(" ");

    page.drawSvgPath(path, { color, borderWidth: 0 });
  };

  if (plagiarismScore === 0) {
    // Full circle blue via two-arc SVG ellipse
    const fullOuter = `M ${(cx - R).toFixed(2)} ${cy.toFixed(2)} A ${R} ${R} 0 1 1 ${(cx + R).toFixed(2)} ${cy.toFixed(2)} A ${R} ${R} 0 1 1 ${(cx - R).toFixed(2)} ${cy.toFixed(2)} Z`;
    page.drawSvgPath(fullOuter, { color: colors.primary, borderWidth: 0 });
    const fullInner = `M ${(cx - r).toFixed(2)} ${cy.toFixed(2)} A ${r} ${r} 0 1 1 ${(cx + r).toFixed(2)} ${cy.toFixed(2)} A ${r} ${r} 0 1 1 ${(cx - r).toFixed(2)} ${cy.toFixed(2)} Z`;
    page.drawSvgPath(fullInner, { color: colors.bgGray, borderWidth: 0 });
  } else {
    // Angles: start at top (-PI/2), go clockwise
    const startAngle = -Math.PI / 2;
    const splitAngle = startAngle + (clampedScore / 100) * 2 * Math.PI;
    const endAngle = startAngle + 2 * Math.PI;

    drawArcSegment(startAngle, splitAngle, colors.primary);
    drawArcSegment(splitAngle, endAngle, colors.danger);
  }

  // Center label
  page.drawText(`${clampedScore}%`, {
    x: cx - 16, y: cy - 7, size: 16, font: fonts.bold, color: colors.text,
  });

  engine.currentY = cy - R - 20;

  // Legend
  const legendY = engine.currentY;
  // Blue swatch
  page.drawRectangle({ x: MARGIN + 40, y: legendY - 4, width: 12, height: 12, color: colors.primary });
  page.drawText(`Original Content \u2014 ${clampedScore}%`, {
    x: MARGIN + 57, y: legendY, size: 9, font: fonts.regular, color: colors.text,
  });
  // Red swatch
  page.drawRectangle({ x: PAGE_WIDTH / 2 + 10, y: legendY - 4, width: 12, height: 12, color: colors.danger });
  page.drawText(`Matched Content \u2014 ${plagiarismScore}%`, {
    x: PAGE_WIDTH / 2 + 27, y: legendY, size: 9, font: fonts.regular, color: colors.text,
  });

  engine.currentY -= 25;
}

// ---------------------------------------------------------------------------
// Task 10 — drawSourceDistributionChart
// ---------------------------------------------------------------------------

export function drawSourceDistributionChart(engine: PdfLayoutEngine, chartData: BarDatum[]): void {
  const { MARGIN } = engine.layout;
  const { fonts, colors } = engine;
  const page = engine.currentPage;

  engine.checkPageBreak(40);
  page.drawText("Source Distribution", {
    x: MARGIN, y: engine.currentY, size: 13, font: fonts.bold, color: colors.text,
  });
  engine.currentY -= 18;

  if (chartData.length === 0) {
    page.drawText("No source data available.", {
      x: MARGIN, y: engine.currentY, size: 10, font: fonts.regular, color: colors.textMuted,
    });
    engine.currentY -= 20;
    return;
  }

  const MAX_BAR_WIDTH = 250;
  const maxVal = Math.max(...chartData.map(d => d.value));

  chartData.forEach((data) => {
    engine.checkPageBreak(22);
    const barWidth = maxVal > 0 ? (data.value / maxVal) * MAX_BAR_WIDTH : 0;
    const labelX = MARGIN;
    const barX = MARGIN + 130;
    const countX = barX + barWidth + 8;

    let label = data.label;
    if (label.length > 20) label = label.slice(0, 20) + "\u2026";

    page.drawText(label, {
      x: labelX, y: engine.currentY, size: 9, font: fonts.regular, color: colors.textMuted,
    });
    page.drawRectangle({
      x: barX, y: engine.currentY - 2, width: Math.max(barWidth, 2), height: 12, color: colors.primary,
    });
    page.drawText(`${data.value}`, {
      x: countX, y: engine.currentY, size: 9, font: fonts.bold, color: colors.text,
    });
    engine.currentY -= 20;
  });

  engine.currentY -= 10;
}

// ---------------------------------------------------------------------------
// Task 11 — drawSimilarityTypeChart
// ---------------------------------------------------------------------------

export function drawSimilarityTypeChart(
  engine: PdfLayoutEngine,
  counts: { exactCount: number; slightCount: number; paraphrasedCount: number }
): void {
  const { MARGIN } = engine.layout;
  const { fonts, colors } = engine;
  const page = engine.currentPage;

  engine.checkPageBreak(100);
  page.drawText("Similarity Type Breakdown", {
    x: MARGIN, y: engine.currentY, size: 13, font: fonts.bold, color: colors.text,
  });
  engine.currentY -= 15;

  const bars = [
    { label: "Exact Match", value: counts.exactCount, color: colors.danger },
    { label: "Slight Changes", value: counts.slightCount, color: colors.warning },
    { label: "Paraphrased", value: counts.paraphrasedCount, color: colors.primary },
  ];

  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const MAX_BAR_HEIGHT = 60;
  const barWidth = 60;
  const spacing = 90;
  const baseY = engine.currentY - MAX_BAR_HEIGHT;

  bars.forEach((bar, i) => {
    const x = MARGIN + i * spacing;
    const barHeight = Math.max((bar.value / maxVal) * MAX_BAR_HEIGHT, bar.value === 0 ? 0 : 2);

    // Count above bar
    page.drawText(String(bar.value), {
      x: x + barWidth / 2 - 4, y: baseY + barHeight + 5, size: 10, font: fonts.bold, color: colors.text,
    });

    if (bar.value > 0) {
      page.drawRectangle({
        x, y: baseY, width: barWidth, height: barHeight, color: bar.color,
      });
    } else {
      // Draw a thin baseline rect so label aligns
      page.drawRectangle({ x, y: baseY, width: barWidth, height: 1, color: bar.color });
    }

    // Label below
    page.drawText(bar.label, {
      x: x + 2, y: baseY - 14, size: 8, font: fonts.regular, color: colors.textMuted,
    });
  });

  engine.currentY = baseY - 30;
}

// ---------------------------------------------------------------------------
// Task 12 — Helper: wrapText
// ---------------------------------------------------------------------------

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word.slice(0, maxChars);
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ---------------------------------------------------------------------------
// Task 12 — drawComparisonSection
// ---------------------------------------------------------------------------

export function drawComparisonSection(
  engine: PdfLayoutEngine,
  match: import("@/services/quetext/quetext.types").MatchDetail,
  index: number
): void {
  const { MARGIN, CONTENT_WIDTH } = engine.layout;
  const { fonts, colors } = engine;

  const leftText = truncateText(match.matchedText || "", 400);
  const sourceText = truncateText(stripHtml(match.highlightedSnippet || match.matchedText || ""), 400);
  const sourceUrl = match.sourceUrl || "Unknown Source";

  const estimatedHeight = 160;
  engine.checkPageBreak(estimatedHeight);

  const page = engine.currentPage;
  const halfWidth = CONTENT_WIDTH / 2 - 5;

  // Match heading
  page.drawText(`Match ${index + 1}`, {
    x: MARGIN, y: engine.currentY, size: 11, font: fonts.bold, color: colors.primary,
  });
  engine.currentY -= 18;

  const panelTopY = engine.currentY;
  const panelHeight = 120;

  // LEFT PANEL — background first, then text
  page.drawRectangle({
    x: MARGIN, y: panelTopY - panelHeight, width: halfWidth, height: panelHeight,
    color: colors.redTint, borderColor: colors.border, borderWidth: 0.5,
  });
  // Blue left-border accent
  page.drawRectangle({ x: MARGIN, y: panelTopY - panelHeight, width: 3, height: panelHeight, color: colors.primary });

  page.drawText("Your Document", {
    x: MARGIN + 8, y: panelTopY - 14, size: 8, font: fonts.bold, color: colors.textMuted,
  });

  const leftLines = wrapText(leftText, 38);
  let ty = panelTopY - 28;
  leftLines.slice(0, 5).forEach((line) => {
    page.drawText(line, { x: MARGIN + 8, y: ty, size: 8, font: fonts.regular, color: colors.text });
    ty -= 12;
  });

  // RIGHT PANEL — background first, then text
  const rightX = MARGIN + halfWidth + 10;
  page.drawRectangle({
    x: rightX, y: panelTopY - panelHeight, width: halfWidth, height: panelHeight,
    color: colors.amberTint, borderColor: colors.border, borderWidth: 0.5,
  });
  // Red left-border accent
  page.drawRectangle({ x: rightX, y: panelTopY - panelHeight, width: 3, height: panelHeight, color: colors.danger });

  page.drawText("Matched Source", {
    x: rightX + 8, y: panelTopY - 14, size: 8, font: fonts.bold, color: colors.textMuted,
  });

  let urlLabel = sourceUrl;
  if (urlLabel.length > 50) urlLabel = urlLabel.slice(0, 50) + "\u2026";
  page.drawText(urlLabel, {
    x: rightX + 8, y: panelTopY - 24, size: 7, font: fonts.regular, color: colors.primary,
  });

  const rightLines = wrapText(sourceText, 38);
  let ry = panelTopY - 38;
  rightLines.slice(0, 4).forEach((line) => {
    page.drawText(line, { x: rightX + 8, y: ry, size: 8, font: fonts.regular, color: colors.text });
    ry -= 12;
  });

  engine.currentY = panelTopY - panelHeight - 15;
}

// ---------------------------------------------------------------------------
// Task 14 — drawRecommendations
// ---------------------------------------------------------------------------

export function drawRecommendations(engine: PdfLayoutEngine, recommendations: string[]): void {
  const { MARGIN, CONTENT_WIDTH } = engine.layout;
  const { fonts, colors } = engine;
  const page = engine.currentPage;

  const blockHeight = 30 + recommendations.length * 20;
  engine.checkPageBreak(blockHeight);

  // Background tint
  page.drawRectangle({
    x: MARGIN, y: engine.currentY - blockHeight, width: CONTENT_WIDTH, height: blockHeight,
    color: colors.bgGray, borderColor: colors.border, borderWidth: 0.5,
  });

  page.drawText("Actionable Recommendations", {
    x: MARGIN + 10, y: engine.currentY - 16, size: 12, font: fonts.bold, color: colors.primary,
  });

  let ry = engine.currentY - 34;
  recommendations.forEach((rec) => {
    engine.checkPageBreak(20);
    page.drawText(`\u2022 ${rec}`, {
      x: MARGIN + 10, y: ry, size: 9, font: fonts.regular, color: colors.text,
    });
    ry -= 18;
  });

  engine.currentY = ry - 10;
}

// ---------------------------------------------------------------------------
// Task 15 — generatePDFReport (exported)
// ---------------------------------------------------------------------------

export async function generatePDFReport(jobId: string): Promise<void> {
  const data = await fetchReportData(jobId);
  const branding = resolveBranding();

  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  
  const colors: ColorPalette = {
    primary: rgb(0.1, 0.4, 0.8),
    text: rgb(0.2, 0.2, 0.2),
    textMuted: rgb(0.4, 0.4, 0.4),
    border: rgb(0.85, 0.85, 0.85),
    bgGray: rgb(0.96, 0.96, 0.96),
    success: rgb(0.1, 0.7, 0.3),
    warning: rgb(0.9, 0.6, 0.1),
    danger: rgb(0.9, 0.2, 0.2),
    redTint: rgb(0.98, 0.92, 0.92),
    amberTint: rgb(0.99, 0.96, 0.88),
  };

  const layout: LayoutConstants = {
    PAGE_WIDTH: 595.28,
    PAGE_HEIGHT: 841.89,
    MARGIN: 50,
    CONTENT_WIDTH: 595.28 - 100,
  };

  const firstPage = doc.addPage([layout.PAGE_WIDTH, layout.PAGE_HEIGHT]);
  
  const engine = new PdfLayoutEngine({
    doc,
    fonts,
    colors,
    layout,
    branding,
    jobId,
    firstPage,
  });

  drawHeader(engine.currentPage, engine);
  engine.currentY -= 60;

  const clampedScore = Math.max(0, Math.min(100, data.originalityScore));
  
  drawExecutiveSummary(engine, {
    originalityScore: clampedScore,
    riskLevel: getRiskLevel(clampedScore),
    wordCount: data.wordCount,
    sourceCount: data.matches.length,
    summary: data.summary || "",
  });

  drawDonutChart(engine, clampedScore);
  
  const chartData = getSourceChartData(data.matches);
  drawSourceDistributionChart(engine, chartData);

  const counts = getSimilarityTypeCounts(data.matches);
  drawSimilarityTypeChart(engine, counts);

  if (data.matches.length === 0) {
    engine.checkPageBreak(40);
    engine.currentPage.drawText("No matches found in this document.", {
      x: layout.MARGIN,
      y: engine.currentY,
      size: 10,
      font: fonts.regular,
      color: colors.textMuted,
    });
    engine.currentY -= 20;
  } else {
    data.matches.forEach((m, idx) => drawComparisonSection(engine, m, idx));
  }

  const recs = buildRecommendations(clampedScore, data.matches);
  drawRecommendations(engine, recs);

  engine.finaliseFooters();

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = branding.downloadFilename(jobId);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import { PDFDocument, PDFPage, PDFFont, RGB, rgb, StandardFonts, degrees } from "pdf-lib";
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
// Risk-color helpers
// ---------------------------------------------------------------------------

interface RiskColors {
  dot: RGB;
  bg: RGB;
  text: RGB;
  accent: RGB;
  fill: RGB;
}

function getPdfRiskColors(score: number, palette: ColorPalette): RiskColors {
  if (score < 50) {
    return { dot: palette.danger, bg: rgb(0.97, 0.92, 0.92), text: palette.danger, accent: palette.danger, fill: palette.danger };
  }
  if (score < 80) {
    return { dot: palette.warning, bg: rgb(0.98, 0.95, 0.88), text: palette.warning, accent: palette.warning, fill: palette.warning };
  }
  return { dot: palette.success, bg: rgb(0.92, 0.97, 0.93), text: palette.success, accent: palette.success, fill: palette.success };
}

function drawRoundedRect(page: PDFPage, x: number, y: number, width: number, height: number, radius: number, color: RGB, borderColor?: RGB, borderWidth?: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  const path = [
    `M ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `A ${r} ${r} 0 0 1 ${x + width} ${y - r}`,
    `L ${x + width} ${y - height + r}`,
    `A ${r} ${r} 0 0 1 ${x + width - r} ${y - height}`,
    `L ${x + r} ${y - height}`,
    `A ${r} ${r} 0 0 1 ${x} ${y - height + r}`,
    `L ${x} ${y - r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    `Z`,
  ].join(" ");
  page.drawSvgPath(path, { color, borderColor, borderWidth: borderWidth ?? 0 });
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
// sanitizeTextForPdf — remove characters WinAnsi cannot encode
// ---------------------------------------------------------------------------

export function sanitizeTextForPdf(text: string): string {
  if (!text) return "";
  return text
    // Replace common smart/curly quotes with ASCII equivalents
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0]/g, " ")
    // Remove surrogate pairs (0xD800-0xDFFF) and any other non-WinAnsi chars
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[^\u0000-\u00FF]/g, (char) => {
      // Try common transliterations
      const translit: Record<string, string> = {
        "\u00E9": "e", "\u00E8": "e", "\u00EA": "e", "\u00EB": "e",
        "\u00E1": "a", "\u00E0": "a", "\u00E2": "a", "\u00E4": "a",
        "\u00ED": "i", "\u00EC": "i", "\u00EE": "i", "\u00EF": "i",
        "\u00F3": "o", "\u00F2": "o", "\u00F4": "o", "\u00F6": "o",
        "\u00FA": "u", "\u00F9": "u", "\u00FB": "u", "\u00FC": "u",
        "\u00F1": "n", "\u00E7": "c", "\u00DF": "ss",
      };
      return translit[char] || "";
    });
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
    drawHeader(newPage, this, (this as any)._riskAccent);
    this.currentY -= 60;
  }

  finaliseFooters(): void {
    const total = this.pages.length;
    const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    const footerText = `${this.branding.appName} · Generated ${dateStr}`;
    this.pages.forEach((p, idx) => {
      const pageNumText = `Page ${idx + 1} of ${total}`;
      const pageNumWidth = this.fonts.regular.widthOfTextAtSize(pageNumText, 7);
      // Border line above footer
      p.drawLine({
        start: { x: this.layout.MARGIN, y: 50 },
        end: { x: this.layout.PAGE_WIDTH - this.layout.MARGIN, y: 50 },
        thickness: 0.5, color: this.colors.border,
      });
      // Page number (centered)
      p.drawText(pageNumText, {
        x: this.layout.PAGE_WIDTH / 2 - pageNumWidth / 2,
        y: 34,
        size: 7,
        font: this.fonts.regular,
        color: this.colors.textMuted,
      });
      // Brand + date (left-aligned)
      p.drawText(footerText, {
        x: this.layout.MARGIN,
        y: 34,
        size: 7,
        font: this.fonts.regular,
        color: this.colors.textMuted,
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Task 7 — drawHeader
// ---------------------------------------------------------------------------

/**
 * Adds a translucent diagonal watermark across every page.
 * Used for high-plagiarism reports to flag risk visually.
 */
function addWatermark(engine: PdfLayoutEngine, text: string, color: RGB): void {
  const { PAGE_WIDTH, PAGE_HEIGHT } = engine.layout;
  engine.pages.forEach((page) => {
    page.drawText(text, {
      x: PAGE_WIDTH / 2 - 120,
      y: PAGE_HEIGHT / 2,
      size: 48,
      font: engine.fonts.bold,
      color,
      rotate: degrees(45),
      opacity: 0.06,
    });
  });
}

function drawHeader(page: PDFPage, engine: PdfLayoutEngine, riskAccent?: RGB): void {
  const { MARGIN, PAGE_WIDTH, PAGE_HEIGHT } = engine.layout;
  const { fonts, colors, branding, jobId } = engine;

  // Risk-colored accent bar (3pt) — mirrors dashboard HeroScorePanel gradient accent
  const accentColor = riskAccent ?? colors.primary;
  page.drawRectangle({
    x: MARGIN, y: PAGE_HEIGHT - MARGIN - 2, width: 40, height: 3,
    color: accentColor,
  });

  page.drawText(branding.appName, {
    x: MARGIN, y: PAGE_HEIGHT - MARGIN - 10, size: 20, font: fonts.bold, color: colors.text,
  });
  page.drawText(branding.appTagline, {
    x: MARGIN + 2, y: PAGE_HEIGHT - MARGIN - 26, size: 8, font: fonts.bold, color: colors.textMuted,
  });
  const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const rightX = PAGE_WIDTH - MARGIN;
  page.drawText(dateStr, {
    x: rightX - 80, y: PAGE_HEIGHT - MARGIN - 10, size: 8, font: fonts.regular, color: colors.textMuted,
  });
  page.drawText(`Report ID: ${jobId}`, {
    x: rightX - 80, y: PAGE_HEIGHT - MARGIN - 22, size: 7, font: fonts.regular, color: colors.textMuted,
  });
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 32 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 32 },
    thickness: 0.75, color: colors.border,
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
  const riskColors = getPdfRiskColors(data.originalityScore, colors);
  const CARD_RADIUS = 5;
  const CARD_GAP = 6;
  const CARD_WIDTH = (CONTENT_WIDTH - CARD_GAP * 3) / 4;
  const CARD_HEIGHT = 72;

  engine.checkPageBreak(180);

  // Report title with risk-colored dot indicator
  page.drawText("Originality Assessment Report", {
    x: MARGIN, y: engine.currentY, size: 16, font: fonts.bold, color: colors.text,
  });
  engine.currentY -= 18;

  // Summary subtitle — show if available, otherwise a context-aware default
  const subtitleText = data.summary
    ? sanitizeTextForPdf(data.summary.slice(0, 120))
    : "Detailed breakdown of matched internet sources and overall originality.";
  page.drawText(subtitleText, {
    x: MARGIN, y: engine.currentY, size: 9, font: fonts.regular, color: colors.textMuted,
  });
  engine.currentY -= 24;

  // 4 separate metric cards (mirrors dashboard grid-cols-4 layout)
  const cardTopY = engine.currentY;
  const qualityRating = data.originalityScore >= 90 ? "Excellent" : data.originalityScore >= 70 ? "Fair" : "Critical";

  const cards = [
    {
      label: "Originality",
      value: `${data.originalityScore}%`,
      color: riskColors.text,
      accent: riskColors.accent,
    },
    {
      label: "Risk Level",
      value: `${data.riskLevel} Risk`,
      color: riskColors.text,
      accent: riskColors.accent,
      pill: true,
      pillBg: riskColors.bg,
    },
    {
      label: "Total Words",
      value: data.wordCount.toLocaleString(),
      color: colors.text,
      accent: colors.primary,
    },
    {
      label: "Quality",
      value: qualityRating,
      color: riskColors.text,
      accent: riskColors.accent,
    },
  ];

  cards.forEach((card, i) => {
    const cx = MARGIN + i * (CARD_WIDTH + CARD_GAP);
    // Card background with rounded corners
    drawRoundedRect(page, cx, cardTopY, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS, rgb(0.985, 0.985, 0.985), colors.border, 0.5);
    // Top accent line
    page.drawRectangle({
      x: cx + 1, y: cardTopY - 1.5, width: CARD_WIDTH - 2, height: 3,
      color: card.accent,
    });
    // Metric value
    const valueSize = card.value.length > 8 ? 16 : 20;
    page.drawText(card.value, {
      x: cx + 12, y: cardTopY - 30, size: valueSize, font: fonts.bold, color: card.color,
    });
    // Metric label
    page.drawText(card.label, {
      x: cx + 12, y: cardTopY - 46, size: 8, font: fonts.regular, color: colors.textMuted,
    });
    // Optional risk-level pill
    if (card.pill) {
      const pillText = card.value;
      const pillW = fonts.bold.widthOfTextAtSize(pillText, 7) + 12;
      const pillX = cx + 12;
      const pillY = cardTopY - 60;
      drawRoundedRect(page, pillX, pillY, pillW, 14, 3, card.pillBg ?? colors.bgGray);
      page.drawText(pillText, {
        x: pillX + 6, y: pillY - 9, size: 7, font: fonts.bold, color: card.color,
      });
    }
  });

  engine.currentY = cardTopY - CARD_HEIGHT - 20;
}

// ---------------------------------------------------------------------------
// Task 9 — drawDonutChart
// ---------------------------------------------------------------------------

export function drawDonutChart(engine: PdfLayoutEngine, originalityScore: number): void {
  const { MARGIN, PAGE_WIDTH, CONTENT_WIDTH } = engine.layout;
  const { fonts, colors } = engine;
  const page = engine.currentPage;
  const riskColors = getPdfRiskColors(originalityScore, colors);
  const clampedScore = Math.max(0, Math.min(100, originalityScore));
  const plagiarismScore = 100 - clampedScore;

  engine.checkPageBreak(200);

  // Section heading
  page.drawText("Content Composition", {
    x: MARGIN, y: engine.currentY, size: 14, font: fonts.bold, color: colors.text,
  });
  engine.currentY -= 8;

  const cx = PAGE_WIDTH / 2;
  const cy = engine.currentY - 78;
  const R = 60; // outer radius
  const r = 34; // inner radius (donut hole)

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

    page.drawSvgPath(path, { color, borderWidth: 0.5, borderColor: rgb(1, 1, 1) });
  };

  if (plagiarismScore === 0) {
    // Single continuous ring using a thick stroked arc (cleaner than two ellipses)
    const fullOuter = `M ${(cx - R).toFixed(2)} ${cy.toFixed(2)} A ${R} ${R} 0 1 1 ${(cx + R).toFixed(2)} ${cy.toFixed(2)} A ${R} ${R} 0 1 1 ${(cx - R).toFixed(2)} ${cy.toFixed(2)} Z`;
    page.drawSvgPath(fullOuter, { color: riskColors.fill, borderWidth: 0 });
    const fullInner = `M ${(cx - r).toFixed(2)} ${cy.toFixed(2)} A ${r} ${r} 0 1 1 ${(cx + r).toFixed(2)} ${cy.toFixed(2)} A ${r} ${r} 0 1 1 ${(cx - r).toFixed(2)} ${cy.toFixed(2)} Z`;
    page.drawSvgPath(fullInner, { color: rgb(1, 1, 1), borderWidth: 0 });
  } else {
    // Angles: start at top (-PI/2), go clockwise
    const startAngle = -Math.PI / 2;
    const splitAngle = startAngle + (clampedScore / 100) * 2 * Math.PI;
    const endAngle = startAngle + 2 * Math.PI;

    drawArcSegment(startAngle, splitAngle, riskColors.fill);
    drawArcSegment(splitAngle, endAngle, colors.danger);
  }

  // Center score label
  page.drawText(`${clampedScore}%`, {
    x: cx - 18, y: cy - 4, size: 18, font: fonts.bold, color: colors.text,
  });
  // Risk label below score
  const riskLabel = `${getRiskLabel(clampedScore)} Risk`;
  page.drawText(riskLabel, {
    x: cx - fonts.bold.widthOfTextAtSize(riskLabel, 7) / 2, y: cy - 18, size: 7,
    font: fonts.bold, color: riskColors.text,
  });

  engine.currentY = cy - R - 16;

  // Risk-colored end caps on the donut (visual polish — mirrors dashboard gauge markers)
  const leftPt = pt(-Math.PI / 2, R + 1);
  page.drawCircle({ x: leftPt.x, y: leftPt.y, size: 4, color: riskColors.dot });

  // Legend with risk-colored swatches
  const legendY = engine.currentY;
  // Original-content swatch (risk-colored)
  drawRoundedRect(page, MARGIN + 50, legendY - 4, 10, 10, 2, riskColors.fill);
  page.drawText(`Original Content — ${clampedScore}%`, {
    x: MARGIN + 64, y: legendY, size: 8, font: fonts.regular, color: colors.text,
  });
  // Matched-content swatch
  drawRoundedRect(page, PAGE_WIDTH / 2 + 20, legendY - 4, 10, 10, 2, colors.danger);
  page.drawText(`Matched Content — ${plagiarismScore}%`, {
    x: PAGE_WIDTH / 2 + 34, y: legendY, size: 8, font: fonts.regular, color: colors.text,
  });

  engine.currentY -= 22;
}

/** Returns a human-readable risk label for a given originality score. */
function getRiskLabel(originalityScore: number): string {
  if (originalityScore < 50) return "High";
  if (originalityScore < 80) return "Medium";
  return "Low";
}

// ---------------------------------------------------------------------------
// Task 10 — drawSourceDistributionChart
// ---------------------------------------------------------------------------

export function drawSourceDistributionChart(engine: PdfLayoutEngine, chartData: BarDatum[]): void {
  const { MARGIN } = engine.layout;
  const { fonts, colors } = engine;
  const page = engine.currentPage;
  // Per-bar risk colors (cycles through risk-high, risk-medium, risk-low)
  const barColors = [colors.danger, colors.warning, colors.primary, rgb(0.45, 0.55, 0.75), rgb(0.55, 0.45, 0.65)];

  engine.checkPageBreak(40);
  page.drawText("Source Distribution", {
    x: MARGIN, y: engine.currentY, size: 14, font: fonts.bold, color: colors.text,
  });
  engine.currentY -= 16;

  if (chartData.length === 0) {
    page.drawText("No source data available.", {
      x: MARGIN, y: engine.currentY, size: 9, font: fonts.regular, color: colors.textMuted,
    });
    engine.currentY -= 18;
    return;
  }

  const MAX_BAR_WIDTH = 200;
  const maxVal = Math.max(...chartData.map(d => d.value));
  const labelWidth = 130;

  chartData.forEach((data, i) => {
    engine.checkPageBreak(20);
    const barColor = barColors[i % barColors.length];
    const barWidth = maxVal > 0 ? (data.value / maxVal) * MAX_BAR_WIDTH : 0;
    const labelX = MARGIN;
    const barX = MARGIN + labelWidth;
    const countX = barX + barWidth + 8;

    let label = sanitizeTextForPdf(data.label);
    if (label.length > 22) label = label.slice(0, 22) + "\u2026";

    page.drawText(label, {
      x: labelX, y: engine.currentY, size: 8, font: fonts.regular, color: colors.textMuted,
    });
    // Rounded bar
    drawRoundedRect(page, barX, engine.currentY - 2, Math.max(barWidth, 3), 12, 2, barColor);
    page.drawText(`${data.value}`, {
      x: countX, y: engine.currentY, size: 9, font: fonts.bold, color: colors.text,
    });
    engine.currentY -= 18;
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
  const similarity = match.similarityScore || 0;
  const matchType = getMatchType(similarity);
  const riskColors = getPdfRiskColors(similarity, colors);

  // Use more generous truncation for better content fidelity
  const leftText = sanitizeTextForPdf(truncateText(match.matchedText || "", 800));
  const sourceText = sanitizeTextForPdf(truncateText(stripHtml(match.highlightedSnippet || match.matchedText || ""), 800));
  const sourceUrl = sanitizeTextForPdf(match.sourceUrl || "Unknown Source");

  const page = engine.currentPage;
  const halfWidth = CONTENT_WIDTH / 2 - 6;
  const LINE_HEIGHT = 11;
  const MAX_LINES_PER_PANEL = 6;

  const leftLines = wrapText(leftText, 42).slice(0, MAX_LINES_PER_PANEL);
  const rightLines = wrapText(sourceText, 42).slice(0, MAX_LINES_PER_PANEL);
  const panelHeight = Math.max(
    60 + Math.max(leftLines.length, rightLines.length) * LINE_HEIGHT,
    100
  );

  engine.checkPageBreak(panelHeight + 40);

  // Match heading + similarity badge (mirrors dashboard's colored % pill)
  page.drawText(`Match ${index + 1}`, {
    x: MARGIN, y: engine.currentY, size: 11, font: fonts.bold, color: colors.text,
  });

  // Similarity % pill
  const pillText = `${similarity}%`;
  const pillTypeText = `  ${matchType}`;
  const pillBgWidth = fonts.bold.widthOfTextAtSize(pillText, 9) + fonts.regular.widthOfTextAtSize(pillTypeText, 8) + 16;
  const pillX = MARGIN + fonts.bold.widthOfTextAtSize(`Match ${index + 1}`, 11) + 10;
  const pillY = engine.currentY - 4;
  drawRoundedRect(page, pillX, pillY, pillBgWidth, 16, 4, riskColors.bg);
  page.drawText(pillText, { x: pillX + 8, y: engine.currentY, size: 9, font: fonts.bold, color: riskColors.text });
  page.drawText(pillTypeText, { x: pillX + 8 + fonts.bold.widthOfTextAtSize(pillText, 9) + 2, y: engine.currentY + 1, size: 8, font: fonts.regular, color: colors.textMuted });

  engine.currentY -= 22;
  const panelTopY = engine.currentY;

  // LEFT PANEL — "Your Document"
  drawRoundedRect(page, MARGIN, panelTopY, halfWidth, panelHeight, 4, colors.redTint, colors.border, 0.5);
  // Blue left-border accent
  page.drawRectangle({ x: MARGIN, y: panelTopY - panelHeight, width: 3, height: panelHeight, color: colors.primary });

  page.drawText("Your Document", {
    x: MARGIN + 8, y: panelTopY - 14, size: 7, font: fonts.bold, color: colors.textMuted,
  });

  let ty = panelTopY - 28;
  leftLines.forEach((line) => {
    page.drawText(line, { x: MARGIN + 8, y: ty, size: 8, font: fonts.regular, color: colors.text });
    ty -= LINE_HEIGHT;
  });

  // RIGHT PANEL — "Matched Source"
  const rightX = MARGIN + halfWidth + 12;
  drawRoundedRect(page, rightX, panelTopY, halfWidth, panelHeight, 4, colors.amberTint, colors.border, 0.5);
  // Red left-border accent
  page.drawRectangle({ x: rightX, y: panelTopY - panelHeight, width: 3, height: panelHeight, color: colors.danger });

  page.drawText("Matched Source", {
    x: rightX + 8, y: panelTopY - 14, size: 7, font: fonts.bold, color: colors.textMuted,
  });

  let urlLabel = sourceUrl;
  if (urlLabel.length > 55) urlLabel = urlLabel.slice(0, 55) + "\u2026";
  page.drawText(urlLabel, {
    x: rightX + 8, y: panelTopY - 24, size: 7, font: fonts.regular, color: colors.primary,
  });

  let ry = panelTopY - 38;
  rightLines.forEach((line) => {
    page.drawText(line, { x: rightX + 8, y: ry, size: 8, font: fonts.regular, color: colors.text });
    ry -= LINE_HEIGHT;
  });

  engine.currentY = panelTopY - panelHeight - 16;
}

// ---------------------------------------------------------------------------
// Task 14 — drawRecommendations
// ---------------------------------------------------------------------------

export function drawRecommendations(engine: PdfLayoutEngine, recommendations: string[]): void {
  const { MARGIN, CONTENT_WIDTH } = engine.layout;
  const { fonts, colors } = engine;
  const page = engine.currentPage;

  const blockHeight = 34 + recommendations.length * 20;
  engine.checkPageBreak(blockHeight);

  // Background tint with risk-colored top border
  drawRoundedRect(page, MARGIN, engine.currentY, CONTENT_WIDTH, blockHeight, 4, colors.bgGray, colors.border, 0.5);
  page.drawRectangle({
    x: MARGIN, y: engine.currentY - 1.5, width: 40, height: 3,
    color: colors.primary,
  });

  page.drawText("Actionable Recommendations", {
    x: MARGIN + 12, y: engine.currentY - 18, size: 12, font: fonts.bold, color: colors.text,
  });

  let ry = engine.currentY - 38;
  recommendations.forEach((rec) => {
    const wrapped = wrapText(rec, 88);
    wrapped.forEach((line, lineIdx) => {
      page.drawText(lineIdx === 0 ? `\u2022 ${line}` : `  ${line}`, {
        x: MARGIN + 12, y: ry, size: 8, font: fonts.regular, color: colors.text,
      });
      ry -= 14;
    });
    ry -= 4; // spacing between bullets
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
  
  // Colors matched to dashboard OKLCh design tokens (converted to RGB)
  const colors: ColorPalette = {
    primary: rgb(0.14, 0.14, 0.14),   // --primary: oklch(0.14 0 0) — near-black
    text: rgb(0.18, 0.18, 0.18),       // --foreground
    textMuted: rgb(0.46, 0.46, 0.46),  // --muted-foreground: oklch(0.5 0 0)
    border: rgb(0.90, 0.90, 0.90),     // --border: oklch(0.93 0 0)
    bgGray: rgb(0.96, 0.96, 0.96),     // --muted: oklch(0.97 0 0)
    success: rgb(0.35, 0.75, 0.45),    // --risk-low: oklch(0.75 0.15 145)
    warning: rgb(0.92, 0.65, 0.15),    // --risk-medium: oklch(0.78 0.15 80)
    danger: rgb(0.85, 0.22, 0.22),     // --risk-high: oklch(0.6 0.2 25)
    redTint: rgb(0.97, 0.92, 0.92),    // match dashboard bg-destructive/10
    amberTint: rgb(0.98, 0.95, 0.88),  // match dashboard bg-amber-500/10
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

  const clampedScore = Math.max(0, Math.min(100, data.originalityScore));
  const riskColors = getPdfRiskColors(clampedScore, colors);
  const riskAccent = riskColors.accent;

  // Set PDF metadata for better document management
  doc.setTitle(`${branding.appName} Report — Job ${jobId}`);
  doc.setAuthor(branding.appName);
  doc.setSubject(`Plagiarism Analysis Report — ${clampedScore}% Original`);
  doc.setKeywords(["plagiarism", "originality", "analysis", "report"]);
  doc.setProducer(branding.appName);
  doc.setCreationDate(new Date());
  doc.setModificationDate(new Date());

  drawHeader(engine.currentPage, engine, riskAccent);
  // Store accent on engine so addPage can reuse it
  (engine as any)._riskAccent = riskAccent;
  engine.currentY -= 60;
  
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

  // Add "HIGH PLAGIARISM RISK" watermark for high-risk reports
  if (clampedScore < 50) {
    addWatermark(engine, "HIGH PLAGIARISM RISK", colors.danger);
  }

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

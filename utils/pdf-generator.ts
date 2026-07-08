import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { FetchReportResponse } from "@/services/quetext/quetext.types";
import { getApiConfig } from "@/utils/api-config";

type RiskLevel = "High" | "Medium" | "Low";
type MatchType = "Exact Match" | "Paraphrased" | "Slight Changes";

interface MatchedSource {
  id: string;
  url: string;
  title: string;
  type: MatchType;
  similarity: number;
  words: number;
  risk: RiskLevel;
}

function getRiskLevel(similarity: number): RiskLevel {
  if (similarity >= 80) return "High";
  if (similarity >= 50) return "Medium";
  return "Low";
}

function getMatchType(similarity: number): MatchType {
  if (similarity >= 95) return "Exact Match";
  if (similarity >= 80) return "Slight Changes";
  return "Paraphrased";
}


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

export async function generatePDFReport(jobId: string) {
  // Fetch real report data from the API
  let report: FetchReportResponse;
  try {
    report = await fetchReportData(jobId);
  } catch (error) {
    console.error("Failed to fetch report data for PDF:", error);
    throw error;
  }

  // Safe destructuring with fallbacks (same pattern as the report page)
  const matches = report.matches || [];
  const originalityScore = report.originalityScore ?? 100;
  const wordCount = report.wordCount ?? 0;
  const summary = report.summary || "";

  // Derive sources from real match data
  const sources: MatchedSource[] = matches.map((m, i) => {
    const similarity = m.similarityScore;
    const matchedText = m.matchedText || "";
    return {
      id: `match-${i}`,
      url: m.sourceUrl || "#",
      title: m.sourceName || m.sourceUrl || "Unknown Source",
      type: getMatchType(similarity),
      similarity,
      words: matchedText.split(/\s+/).length,
      risk: getRiskLevel(similarity),
    };
  });

  // Group sources by domain for the bar chart
  const domainCounts: Record<string, number> = {};
  matches.forEach(m => {
    if (m.sourceUrl) {
      try {
        const domain = new URL(m.sourceUrl).hostname.replace('www.', '');
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      } catch {
        const name = m.sourceName || "Unknown";
        domainCounts[name] = (domainCounts[name] || 0) + 1;
      }
    } else if (m.sourceName) {
      domainCounts[m.sourceName] = (domainCounts[m.sourceName] || 0) + 1;
    }
  });

  const riskLevel = originalityScore >= 80 ? "Low" : originalityScore >= 50 ? "Medium" : "High";

  // Create PDF
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 50;

  const colors = {
    primary: rgb(0.1, 0.4, 0.8),
    text: rgb(0.2, 0.2, 0.2),
    textMuted: rgb(0.4, 0.4, 0.4),
    border: rgb(0.9, 0.9, 0.9),
    bgGray: rgb(0.96, 0.96, 0.96),
    success: rgb(0.1, 0.7, 0.4),
    warning: rgb(0.9, 0.6, 0.1),
    danger: rgb(0.9, 0.2, 0.2),
  };

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const pages: any[] = [page];
  let currentY = PAGE_HEIGHT - MARGIN;

  const checkPageBreak = (requiredSpace: number) => {
    if (currentY - requiredSpace < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      currentY = PAGE_HEIGHT - MARGIN;
      drawHeader(page);
      currentY -= 60;
      return true;
    }
    return false;
  };

  const drawText = (text: string, font: any, size: number, color: any, x: number, y: number) => {
    page.drawText(text, { x, y, size, font, color });
    return y - (size * 1.2);
  };

  const drawHeader = (p: any) => {
    p.drawText("Plagiarism Guard", {
      x: MARGIN, y: PAGE_HEIGHT - MARGIN, size: 24, font: helveticaBold, color: colors.primary,
    });
    p.drawText("DETECT • PROTECT • VERIFY", {
      x: MARGIN + 2, y: PAGE_HEIGHT - MARGIN - 14, size: 8, font: helveticaBold, color: colors.textMuted,
    });
    const dateStr = new Date().toLocaleDateString();
    p.drawText(`Date: ${dateStr}`, {
      x: PAGE_WIDTH - MARGIN - 70, y: PAGE_HEIGHT - MARGIN, size: 10, font: helveticaFont, color: colors.textMuted,
    });
    p.drawText(`Report ID: ${jobId}`, {
      x: PAGE_WIDTH - MARGIN - 70, y: PAGE_HEIGHT - MARGIN - 14, size: 8, font: helveticaFont, color: colors.textMuted,
    });
    p.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 25 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 25 },
      thickness: 1, color: colors.border,
    });
  };

  drawHeader(page);
  currentY -= 60;

  // Title
  currentY = drawText("Originality Assessment Report", helveticaBold, 20, colors.text, MARGIN, currentY);
  currentY = drawText(summary || "This document provides a detailed breakdown of matched internet sources and overall originality.", helveticaFont, 10, colors.textMuted, MARGIN, currentY);
  currentY -= 20;

  // Executive Summary Box
  page.drawRectangle({
    x: MARGIN, y: currentY - 80, width: PAGE_WIDTH - (MARGIN * 2), height: 80,
    color: colors.bgGray, borderColor: colors.border, borderWidth: 1,
  });

  const boxY = currentY - 25;
  drawText(`${originalityScore}%`, helveticaBold, 24, colors.success, MARGIN + 20, boxY);
  drawText("Originality", helveticaFont, 10, colors.textMuted, MARGIN + 20, boxY - 15);

  drawText(riskLevel, helveticaBold, 24, colors.primary, MARGIN + 140, boxY);
  drawText("Risk Level", helveticaFont, 10, colors.textMuted, MARGIN + 140, boxY - 15);

  drawText(wordCount.toLocaleString(), helveticaBold, 24, colors.text, MARGIN + 260, boxY);
  drawText("Total Words", helveticaFont, 10, colors.textMuted, MARGIN + 260, boxY - 15);

  drawText(sources.length.toString(), helveticaBold, 24, colors.warning, MARGIN + 380, boxY);
  drawText("Sources Found", helveticaFont, 10, colors.textMuted, MARGIN + 380, boxY - 15);

  currentY -= 120;

  // Source Distribution Bar Chart
  currentY = drawText("Source Distribution Analysis", helveticaBold, 14, colors.text, MARGIN, currentY);
  currentY -= 10;

  const chartData = Object.entries(domainCounts)
    .map(([label, val]) => ({ label, val }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 5);

  if (chartData.length > 0) {
    const maxVal = Math.max(...chartData.map(d => d.val));
    const maxBarWidth = 250;

    chartData.forEach((data) => {
      page.drawText(data.label, { x: MARGIN, y: currentY, size: 10, font: helveticaFont, color: colors.textMuted });
      const barWidth = (data.val / maxVal) * maxBarWidth;
      page.drawRectangle({
        x: MARGIN + 80, y: currentY - 2, width: barWidth, height: 12, color: colors.primary,
      });
      page.drawText(`${data.val} matches`, { x: MARGIN + 80 + barWidth + 10, y: currentY, size: 9, font: helveticaBold, color: colors.text });
      currentY -= 20;
    });
    currentY -= 30;
  } else {
    currentY -= 15;
    page.drawText("No source distribution data available.", { x: MARGIN, y: currentY, size: 10, font: helveticaFont, color: colors.textMuted });
    currentY -= 30;
  }

  // Matched Sources Table
  currentY = drawText("Detailed Findings (Matched Sources)", helveticaBold, 14, colors.text, MARGIN, currentY);
  currentY -= 10;

  page.drawRectangle({
    x: MARGIN, y: currentY - 5, width: PAGE_WIDTH - (MARGIN * 2), height: 20, color: colors.bgGray,
  });
  drawText("Source Title / URL", helveticaBold, 9, colors.text, MARGIN + 5, currentY);
  drawText("Similarity", helveticaBold, 9, colors.text, MARGIN + 280, currentY);
  drawText("Type", helveticaBold, 9, colors.text, MARGIN + 350, currentY);
  drawText("Risk", helveticaBold, 9, colors.text, MARGIN + 430, currentY);
  currentY -= 25;

  if (sources.length === 0) {
    page.drawText("No matched sources found.", { x: MARGIN + 5, y: currentY, size: 10, font: helveticaFont, color: colors.textMuted });
    currentY -= 25;
  } else {
    sources.forEach((source) => {
      checkPageBreak(50);
      let title = source.title;
      if (title.length > 45) title = title.substring(0, 45) + "...";
      page.drawText(title, { x: MARGIN + 5, y: currentY, size: 10, font: helveticaBold, color: colors.text });
      let url = source.url;
      if (url.length > 55) url = url.substring(0, 55) + "...";
      page.drawText(url, { x: MARGIN + 5, y: currentY - 12, size: 8, font: helveticaFont, color: colors.primary });
      page.drawText(`${source.similarity}%`, { x: MARGIN + 280, y: currentY, size: 10, font: helveticaFont, color: colors.text });
      page.drawText(source.type, { x: MARGIN + 350, y: currentY, size: 9, font: helveticaFont, color: colors.textMuted });
      const riskColor = source.risk === "High" ? colors.danger : source.risk === "Medium" ? colors.warning : colors.success;
      page.drawText(source.risk, { x: MARGIN + 430, y: currentY, size: 10, font: helveticaBold, color: riskColor });
      page.drawLine({
        start: { x: MARGIN, y: currentY - 20 },
        end: { x: PAGE_WIDTH - MARGIN, y: currentY - 20 },
        thickness: 0.5, color: colors.border,
      });
      currentY -= 35;
    });
  }

  // Recommendations
  checkPageBreak(120);
  currentY -= 20;
  page.drawRectangle({
    x: MARGIN, y: currentY - 70, width: PAGE_WIDTH - (MARGIN * 2), height: 70,
    color: rgb(0.1, 0.4, 0.8), opacity: 0.05,
  });
  currentY = drawText("Actionable Recommendations", helveticaBold, 12, colors.primary, MARGIN + 15, currentY - 15);
  currentY -= 5;
  drawText("• Review all 'High Risk' exact matches and ensure proper citation formatting.", helveticaFont, 10, colors.text, MARGIN + 15, currentY);
  currentY -= 15;
  drawText("• For 'Paraphrased' sections, consider rewriting in your own authentic voice.", helveticaFont, 10, colors.text, MARGIN + 15, currentY);
  currentY -= 15;
  drawText("• Overall originality is excellent. Proceed with final review before submission.", helveticaFont, 10, colors.text, MARGIN + 15, currentY);

  // Page Numbers
  pages.forEach((p, idx) => {
    p.drawText(`Page ${idx + 1} of ${pages.length}`, {
      x: PAGE_WIDTH / 2 - 20, y: 20, size: 9, font: helveticaFont, color: colors.textMuted,
    });
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PlagiarismGuard_Report_${jobId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

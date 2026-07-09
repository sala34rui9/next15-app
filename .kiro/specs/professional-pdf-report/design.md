# Design Document — Professional PDF Report

## Overview

This feature elevates `utils/pdf-generator.ts` from a plain text-and-table PDF into a rich, multi-page professional report that mirrors the quality of the web dashboard. The changes fall into two buckets:

1. **PDF enhancements** — donut chart, two bar charts, side-by-side comparison sections with background shading, dynamic branding, data-driven recommendations, and robust multi-page layout.
2. **Web bug fix** — `MatchedSourcesTable` currently shows `item.snippet` (derived from `matchedText`) in both the left and right expanded-row panels. The right panel must use `MatchDetail.highlightedSnippet`.

All chart rendering stays within `pdf-lib` — no external chart library is added. The existing `download-report-button.tsx` and the public API shape of `generatePDFReport(jobId)` are unchanged.

---

## Architecture

```mermaid
flowchart TD
    A["DownloadReportButton\n(components/reports)"] -->|calls| B["generatePDFReport(jobId)\nutils/pdf-generator.ts"]
    B --> C[fetchReportData → /api/quetext/report]
    C --> D[FetchReportResponse]
    D --> B
    B --> E[resolveBranding\nenv vars]
    B --> F[buildDocumentSections\nreturns Section[]]
    F --> G[PdfLayoutEngine\nstateful Y-cursor + page manager]
    G --> H{fits on page?}
    H -- yes --> I[draw section on current page]
    H -- no --> J[addPage + drawHeader + draw section]
    I & J --> K[finaliseFooters\nPage N of M on all pages]
    K --> L[pdfDoc.save() → download]

    subgraph "Section Renderers (pure functions)"
        R1[drawHeader]
        R2[drawExecutiveSummary]
        R3[drawDonutChart]
        R4[drawSourceDistributionChart]
        R5[drawSimilarityTypeChart]
        R6[drawComparisonSection]
        R7[drawRecommendations]
    end

    F --> R1 & R2 & R3 & R4 & R5 & R6 & R7
```

The generator is a single TypeScript module. Internal helpers are pure functions that accept explicit parameters (page reference, Y position, data, colours, fonts) and return the new Y position after drawing. The `PdfLayoutEngine` wraps the mutable `pdf-lib` `PDFDocument`, tracks the current page and Y-cursor, and exposes a `checkPageBreak(requiredHeight)` method that adds a new page (with header) when needed.

---

## Components and Interfaces

### `utils/pdf-generator.ts` — public surface (unchanged)

```ts
export async function generatePDFReport(jobId: string): Promise<void>
```

### Internal types added to the module

```ts
interface PdfContext {
  doc: PDFDocument;
  pages: PDFPage[];
  currentPage: PDFPage;
  currentY: number;
  fonts: { regular: PDFFont; bold: PDFFont };
  colors: ColorPalette;
  layout: LayoutConstants;
}

interface LayoutConstants {
  PAGE_WIDTH: number;   // 595.28
  PAGE_HEIGHT: number;  // 841.89
  MARGIN: number;       // 50
  CONTENT_WIDTH: number; // PAGE_WIDTH - 2 * MARGIN
}

interface ColorPalette {
  primary: RGB;   // rgb(0.1, 0.4, 0.8)
  text: RGB;
  textMuted: RGB;
  border: RGB;
  bgGray: RGB;
  success: RGB;
  warning: RGB;   // rgb(0.9, 0.6, 0.1)
  danger: RGB;    // rgb(0.9, 0.2, 0.2)
  redTint: RGB;   // rgb(0.98, 0.92, 0.92)
  amberTint: RGB; // rgb(0.99, 0.96, 0.88)
}

interface BrandingConfig {
  appName: string;
  appTagline: string;
  downloadFilename: (jobId: string) => string;
}

interface DonutSegment {
  startAngle: number;
  endAngle: number;
  color: RGB;
  label: string;
  percentage: number;
}

interface BarDatum {
  label: string;
  value: number;
  color: RGB;
}
```

### `components/reports/matched-sources-table.tsx` — minimal fix

The `DerivedSource` interface gains a `highlightedSnippet` field. The expanded-row right panel changes from `{item.snippet}` to `{item.highlightedSnippet || item.snippet}`.

---

## Data Models

### Derived values computed from `FetchReportResponse`

| Derived | Formula |
|---|---|
| `plagiarismScore` | `100 − originalityScore` |
| `riskLevel` | `"High"` if `originalityScore < 50`; `"Medium"` if `< 80`; else `"Low"` |
| `matchType(m)` | `"Exact Match"` if `similarityScore ≥ 95`; `"Slight Changes"` if `≥ 80`; else `"Paraphrased"` |
| `domainLabel(m)` | Try `new URL(sourceUrl).hostname.replace('www.','')`, else `sourceName`, else `"Unknown"` |
| `appName` | `process.env.NEXT_PUBLIC_APP_NAME \|\| "Plagiarism Guard"` |
| `appTagline` | `process.env.NEXT_PUBLIC_APP_TAGLINE \|\| "DETECT • PROTECT • VERIFY"` |
| `downloadFilename` | `appName.toLowerCase().replace(/\s+/g,'-') + "_Report_" + jobId` |

### Recommendations derivation

Recommendations are built from a priority list; the final set is capped at 4:

| Condition | Recommendation text |
|---|---|
| `riskLevel === "High"` | "Significant plagiarism detected. Review all exact and high-similarity matches and add proper citations." |
| `riskLevel === "Medium"` | "Moderate similarity detected. Consider rewording paraphrased sections and verify citation formatting." |
| `riskLevel === "Low"` | "Originality is strong. Perform a final review of any flagged sources before submission." |
| any match is `"Exact Match"` | "Exact matches found — ensure all quoted material uses proper quotation marks and citations." |
| all matches are `"Paraphrased"` | "All matches are paraphrased. Rewrite flagged sections in your own voice or add attributions." |

The risk-level recommendation is always included (guaranteeing ≥ 1). The match-type recommendations are appended when their conditions are met, stopping when the total reaches 4.

### HTML stripping

A simple regex `text.replace(/<[^>]*>/g, "")` is applied to `highlightedSnippet` before any PDF text draw. This handles `<b>`, `</b>`, and other inline tags present in the Quetext response.

### Text truncation

`matchedText` and the stripped `highlightedSnippet` are each truncated to 400 characters before rendering; a trailing `"…"` is appended when truncation occurs.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Donut chart segment colours always match originality score

*For any* originality score in [0, 100], the donut chart draw operations should include exactly one arc segment drawn in primary blue `rgb(0.1, 0.4, 0.8)` with angular extent proportional to `originalityScore`, and — when `plagiarismScore > 0` — exactly one arc segment in danger red `rgb(0.9, 0.2, 0.2)` with angular extent proportional to `plagiarismScore`. The two angular extents must sum to exactly 2π.

**Validates: Requirements 1.2, 1.5**

---

### Property 2: Donut chart legend percentages are consistent with the score

*For any* originality score in [0, 100], the legend text rendered below the donut chart must contain both the string representation of `originalityScore` (for "Original Content") and the string representation of `100 − originalityScore` (for "Matched Content").

**Validates: Requirements 1.4**

---

### Property 3: Source distribution chart is sorted and capped

*For any* collection of `MatchDetail` records, the source distribution chart should display at most 5 entries, ordered strictly descending by match count — meaning `chartData[i].value >= chartData[i+1].value` for all adjacent pairs.

**Validates: Requirements 2.1**

---

### Property 4: Domain label derivation is correct for all input shapes

*For any* `MatchDetail`, `domainLabel(m)` must equal: the hostname (www-stripped) when `sourceUrl` is a valid URL; otherwise `sourceName` when present; otherwise `"Unknown"`. This must hold for valid URLs, malformed URL strings, absent `sourceUrl`, and absent both fields.

**Validates: Requirements 2.2**

---

### Property 5: Bar widths are proportional to match counts

*For any* non-empty domain-count dataset, the bar width assigned to each domain must satisfy `barWidth / MAX_BAR_WIDTH === domainCount / maxDomainCount` (within floating-point tolerance), and the domain with the highest count always receives exactly `MAX_BAR_WIDTH`.

**Validates: Requirements 2.3**

---

### Property 6: Similarity type categorisation counts are exhaustive

*For any* array of `MatchDetail` records, the sum `exactCount + slightCount + paraphrasedCount` computed by the similarity-type chart must equal `matches.length`.

**Validates: Requirements 3.1**

---

### Property 7: Every match produces exactly one comparison section

*For any* non-empty `matches` array of length N, the PDF render pipeline must produce exactly N comparison blocks (each identified by its "Your Document" / "Matched Source" heading pair).

**Validates: Requirements 4.1**

---

### Property 8: Right panel always uses highlightedSnippet with matchedText fallback

*For any* `MatchDetail`, the content rendered in the right panel of the comparison section (and the expanded-row right panel in `MatchedSourcesTable`) must equal `highlightedSnippet` (HTML-stripped) when that field is a non-empty string, or `matchedText` otherwise.

**Validates: Requirements 4.3, 8.2, 8.3**

---

### Property 9: HTML stripping removes all tags and preserves content

*For any* string, `stripHtml(s)` must contain no `<` or `>` characters, and for strings that contain only plain text interleaved with HTML tags, the non-tag characters must be fully preserved in their original order.

**Validates: Requirements 4.4**

---

### Property 10: Text truncation is bounded and preserves short strings

*For any* string `s`, `truncateText(s, 400)` must produce a result of length ≤ 401 (400 chars + `"…"`). When `s.length ≤ 400`, the result must equal `s` unchanged.

**Validates: Requirements 4.7**

---

### Property 11: Branding values appear verbatim in the header

*For any* non-empty `appName` and `appTagline` strings, the header draw operations must include those exact strings. This must hold across every page of a multi-page PDF.

**Validates: Requirements 6.1, 6.2, 9.3**

---

### Property 12: Download filename follows the prescribed format

*For any* `appName` string and `jobId` string, `buildFilename(appName, jobId)` must equal `appName.toLowerCase().replace(/\s+/g, '-') + "_Report_" + jobId`.

**Validates: Requirements 6.5**

---

### Property 13: Recommendations are always in [1, 4] and match derivation rules

*For any* combination of `originalityScore` and `matches` array, the generated recommendation bullets must: (a) contain at least 1 and at most 4 items; (b) always include the risk-level recommendation that corresponds to the derived `riskLevel`; (c) include the exact-match citation recommendation if and only if at least one match has `similarityScore ≥ 95`; (d) include the paraphrase recommendation if and only if every match has `similarityScore < 80`.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

---

### Property 14: No content drawn below the bottom margin

*For any* report data (varying match count, text lengths, originality score), every draw operation (text or rectangle) placed on any page must have its `y` coordinate ≥ `MARGIN` (50 pt). This guarantees both overflow prevention and that no content is clipped.

**Validates: Requirements 9.1, 9.4**

---

### Property 15: Every page has a "Page N of M" footer with correct values

*For any* report data that produces M pages, every page index i must contain the footer text `"Page " + (i+1) + " of " + M`, centred at the bottom.

**Validates: Requirements 9.2**

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `fetchReportData` network / HTTP error | Propagates the thrown `Error`; `DownloadReportButton` catches it and shows a `toast.error` |
| `sourceUrl` is a malformed URL string | `domainLabel` catches the `URL` constructor exception and falls through to `sourceName` / `"Unknown"` |
| `originalityScore` outside [0, 100] | Clamped to `[0, 100]` before computing arc angles to prevent degenerate geometry |
| `matches` is `undefined` | Defaults to `[]` (existing pattern preserved) |
| `highlightedSnippet` is absent or empty | Falls back to `matchedText` for both PDF and table expanded row |
| Very long text (> 400 chars) | Truncated to 400 + `"…"` before drawing to prevent overflow |
| Zero matches | Placeholder strings rendered in all chart/comparison positions |
| `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_TAGLINE` absent or empty | Hard-coded defaults applied in `resolveBranding()` |

---

## Testing Strategy

### Unit tests (example-based)

Targeted at specific rendering calls and edge-case branches. Cover:

- `resolvesBranding()` returns defaults when env vars are absent/empty (Requirements 6.3, 6.4)
- `domainLabel()` for valid URL, invalid URL, absent `sourceUrl`, absent both fields (Requirements 2.2)
- `drawDonutChart()` emits the correct number of path calls for a zero-plagiarism score (Requirement 1.5)
- `getSimilarityTypeData()` bar colours are exactly the three specified RGB values (Requirement 3.2)
- `drawComparisonSection()` includes source URL or "Unknown Source" label (Requirement 4.6)
- `drawComparisonSection()` draws background rect before text for each panel (Requirement 5.1, 5.2)
- `drawRecommendations()` renders ≥ 1 bullet for a zero-match document (Requirement 7.3)
- Expanded row in `MatchedSourcesTable` shows `matchedText` on the left panel (Requirement 8.1)
- Page numbers rendered after `finaliseFooters()` for a single-page report (Requirement 9.2)
- Placeholder text "No source data available." when matches is empty (Requirement 2.5)
- Placeholder text "No matches found in this document." when matches is empty (Requirement 4.8)
- Similarity type chart still renders three bars when all counts are zero (Requirement 3.4)

### Property-based tests

Library: **fast-check** (already aligned with the TypeScript / Node ecosystem; zero new peer dependencies if added as a dev dependency).

Each property test runs a minimum of **100 iterations**.

Tag format per test: `// Feature: professional-pdf-report, Property <N>: <property_text>`

| Property | Test description |
|---|---|
| **P1** — Donut colour/angle correctness | Generate `originalityScore` in [0,100]; assert arc colours and angles match |
| **P2** — Legend percentage consistency | Generate `originalityScore`; assert legend strings contain correct percentages |
| **P3** — Source chart sorted and capped | Generate random `MatchDetail[]`; assert ≤ 5 entries, descending order |
| **P4** — Domain label derivation | Generate `{sourceUrl?, sourceName?}` combos; assert label follows priority rules |
| **P5** — Bar width proportionality | Generate domain-count maps; assert `barWidth / MAX === count / maxCount` |
| **P6** — Similarity count exhaustiveness | Generate `MatchDetail[]`; assert `exact + slight + para === matches.length` |
| **P7** — Comparison section count | Generate `MatchDetail[]` of length N; assert N comparison blocks rendered |
| **P8** — Right panel source selection | Generate `{matchedText, highlightedSnippet?}`; assert panel content correct |
| **P9** — HTML stripping | Generate strings with random HTML tags; assert output has no `<` or `>` |
| **P10** — Truncation bounds | Generate strings of arbitrary length; assert truncated length ≤ 401 and short strings unchanged |
| **P11** — Branding verbatim in header | Generate random `appName` / `appTagline`; assert header text contains them |
| **P12** — Filename format | Generate random `appName` / `jobId`; assert filename matches formula |
| **P13** — Recommendations correctness | Generate `(originalityScore, MatchDetail[])`; assert bullet count in [1,4] and content matches derivation rules |
| **P14** — No content below margin | Generate varied report data; assert all draw-op `y` coordinates ≥ `MARGIN` |
| **P15** — Page footer correctness | Generate multi-match reports; assert every page has correct "Page N of M" text |

### Integration / smoke tests

- Build the project (`next build`) and assert no TypeScript errors are introduced by the changes.
- Verify `matched-sources-table.tsx` renders both panels with distinct content when `highlightedSnippet !== matchedText` (Requirement 8.3).

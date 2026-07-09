# Implementation Plan: Professional PDF Report

## Overview

Two-file implementation: a full rewrite of `utils/pdf-generator.ts` to produce a rich, multi-page PDF with donut chart, two bar charts, side-by-side comparison sections, dynamic branding, and data-driven recommendations; and a targeted bug fix in `components/reports/matched-sources-table.tsx` to render the correct `highlightedSnippet` field in the right panel of expanded rows.

Property-based tests use **fast-check** (must be installed as a dev dependency before the test tasks run).

---

## Tasks

- [x] 1. Install fast-check and set up the test file skeleton
  - Run `npm install --save-dev fast-check` to add fast-check as a dev dependency
  - Create `utils/__tests__/pdf-generator.test.ts` with the import scaffold:
    - Import `fc` from `fast-check` and the helpers to be tested (stubbed initially)
    - Add the tag comment header: `// Feature: professional-pdf-report`
  - Confirm TypeScript compiles with no errors after the install
  - _Requirements: (test infrastructure — all properties)_

- [x] 2. Implement pure utility helpers and internal types
  - [x] 2.1 Define all internal TypeScript interfaces in `utils/pdf-generator.ts`
    - `PdfContext`, `LayoutConstants`, `ColorPalette`, `BrandingConfig`, `DonutSegment`, `BarDatum`
    - Export nothing new; keep `generatePDFReport` as the sole public export
    - _Requirements: (architecture foundation)_

  - [x] 2.2 Implement `resolveBranding(): BrandingConfig`
    - Read `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_TAGLINE` from `process.env`
    - Default to `"Plagiarism Guard"` / `"DETECT • PROTECT • VERIFY"` when absent or empty string
    - Build `downloadFilename` as `appName.toLowerCase().replace(/\s+/g, '-') + "_Report_" + jobId`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 2.3 Write unit tests for `resolveBranding()`
    - Test: env vars absent → defaults returned (Requirements 6.3, 6.4)
    - Test: env vars present → values used verbatim (Requirements 6.1, 6.2)
    - _Requirements: 6.3, 6.4_

  - [x] 2.4 Implement `buildFilename(appName: string, jobId: string): string`
    - Pure function: `appName.toLowerCase().replace(/\s+/g, '-') + "_Report_" + jobId`
    - _Requirements: 6.5_

  - [ ]* 2.5 Write property test for `buildFilename` (Property 12)
    - `// Feature: professional-pdf-report, Property 12: Download filename follows the prescribed format`
    - Generate arbitrary `appName` and `jobId` strings; assert result equals formula
    - **Property 12: Download filename format**
    - **Validates: Requirements 6.5**
    - _Requirements: 6.5_

  - [x] 2.6 Implement `stripHtml(text: string): string`
    - `text.replace(/<[^>]*>/g, "")`
    - _Requirements: 4.4_

  - [ ]* 2.7 Write property test for `stripHtml` (Property 9)
    - `// Feature: professional-pdf-report, Property 9: HTML stripping removes all tags and preserves content`
    - Generate strings with random HTML tags; assert output has no `<` or `>` characters and non-tag characters are preserved
    - **Property 9: HTML tag stripping**
    - **Validates: Requirements 4.4**
    - _Requirements: 4.4_

  - [x] 2.8 Implement `truncateText(text: string, limit: number): string`
    - Return `text` unchanged when `text.length <= limit`; else return `text.slice(0, limit) + "…"`
    - _Requirements: 4.7_

  - [ ]* 2.9 Write property test for `truncateText` (Property 10)
    - `// Feature: professional-pdf-report, Property 10: Text truncation is bounded and preserves short strings`
    - Generate strings of arbitrary length; assert truncated length ≤ `limit + 1` and strings ≤ limit are unchanged
    - **Property 10: Truncation bounds**
    - **Validates: Requirements 4.7**
    - _Requirements: 4.7_

  - [x] 2.10 Implement `domainLabel(m: MatchDetail): string`
    - Try `new URL(m.sourceUrl).hostname.replace('www.', '')`; catch parse errors and fall through to `m.sourceName`; finally fall back to `"Unknown"`
    - _Requirements: 2.2_

  - [ ]* 2.11 Write property test for `domainLabel` (Property 4)
    - `// Feature: professional-pdf-report, Property 4: Domain label derivation is correct for all input shapes`
    - Generate `{ sourceUrl?, sourceName? }` combos covering valid URL / malformed string / absent fields
    - **Property 4: Domain label derivation**
    - **Validates: Requirements 2.2**
    - _Requirements: 2.2_

  - [x] 2.12 Implement `getRiskLevel(originalityScore: number): "High" | "Medium" | "Low"`
    - `< 50` → `"High"`, `< 80` → `"Medium"`, else `"Low"`
    - _Requirements: (data model)_

  - [x] 2.13 Implement `getMatchType(similarityScore: number): "Exact Match" | "Slight Changes" | "Paraphrased"`
    - `>= 95` → `"Exact Match"`, `>= 80` → `"Slight Changes"`, else `"Paraphrased"`
    - _Requirements: (data model)_

- [ ] 3. Checkpoint — utility helpers
  - Ensure all tests pass and TypeScript compiles cleanly; ask the user if questions arise.

- [x] 4. Implement `buildRecommendations` and `getSimilarityTypeCounts`
  - [x] 4.1 Implement `buildRecommendations(originalityScore: number, matches: MatchDetail[]): string[]`
    - Derive `riskLevel` from `originalityScore`
    - Always push the risk-level recommendation (one of three strings from design)
    - Push exact-match recommendation when at least one match has `similarityScore >= 95`
    - Push paraphrase recommendation when every match has `similarityScore < 80` (and total not yet 4)
    - Cap result at 4 items
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 4.2 Write property test for `buildRecommendations` (Property 13)
    - `// Feature: professional-pdf-report, Property 13: Recommendations are always in [1,4] and match derivation rules`
    - Generate `(originalityScore in [0,100], MatchDetail[])` combinations
    - Assert: length in `[1, 4]`; risk-level bullet always present; exact-match bullet iff any match `>= 95`; paraphrase bullet iff all matches `< 80`
    - **Property 13: Recommendations correctness**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
    - _Requirements: 7.1–7.6_

  - [x] 4.3 Implement `getSimilarityTypeCounts(matches: MatchDetail[]): { exactCount: number; slightCount: number; paraphrasedCount: number }`
    - Count each match type by applying `getMatchType` to each entry's `similarityScore`
    - _Requirements: 3.1_

  - [ ]* 4.4 Write property test for `getSimilarityTypeCounts` (Property 6)
    - `// Feature: professional-pdf-report, Property 6: Similarity type categorisation counts are exhaustive`
    - Generate `MatchDetail[]` of arbitrary length; assert `exactCount + slightCount + paraphrasedCount === matches.length`
    - **Property 6: Similarity counts are exhaustive**
    - **Validates: Requirements 3.1**
    - _Requirements: 3.1_

  - [x] 4.5 Implement `getSourceChartData(matches: MatchDetail[]): BarDatum[]`
    - Aggregate match counts by `domainLabel`; sort descending; slice to top 5
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 4.6 Write property test for `getSourceChartData` (Property 3)
    - `// Feature: professional-pdf-report, Property 3: Source distribution chart is sorted and capped`
    - Generate `MatchDetail[]`; assert result has `<= 5` entries and `chartData[i].value >= chartData[i+1].value` for all adjacent pairs
    - **Property 3: Source chart sorted and capped**
    - **Validates: Requirements 2.1**
    - _Requirements: 2.1_

- [ ] 5. Implement `PdfLayoutEngine` class
  - Create the stateful class wrapping `PDFDocument`:
    - Constructor accepts `pdfDoc`, `fonts`, `colors`, `layout`, `branding`, `jobId`
    - Tracks `currentPage: PDFPage`, `pages: PDFPage[]`, `currentY: number`
    - `checkPageBreak(requiredHeight: number)`: if `currentY - requiredHeight < MARGIN` → call `addPage()` and return `true`
    - `addPage()`: appends a new page, calls `drawHeader()` on it, resets `currentY` to `PAGE_HEIGHT - MARGIN - 60`
    - `finaliseFooters()`: iterates `pages` and draws `"Page N of M"` centred at `y: 20` on each
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 6. Checkpoint — data layer and layout engine
  - Ensure all tests pass; ask the user if questions arise.

- [~] 7. Implement section renderer: `drawHeader`
  - Accept `(page: PDFPage, ctx: PdfContext)` — draws app name, tagline, date, report ID, and horizontal rule
  - Use `ctx.branding.appName` and `ctx.branding.appTagline` — no hard-coded strings
  - _Requirements: 6.1, 6.2, 9.3_

- [~] 8. Implement section renderer: `drawExecutiveSummary`
  - Accept `(engine: PdfLayoutEngine, data: ReportDerivedData)` — renders the four-metric summary box (originality %, risk level, word count, sources found)
  - Call `engine.checkPageBreak(100)` before drawing
  - _Requirements: (executive summary box)_

- [~] 9. Implement section renderer: `drawDonutChart`
  - [ ] 9.1 Implement the donut chart arc drawing logic
    - Clamp `originalityScore` to `[0, 100]` before computing angles
    - Draw the originality arc in `colors.primary` (blue) proportional to `originalityScore / 100 * 2π`
    - Draw the plagiarism arc in `colors.danger` (red) proportional to `plagiarismScore / 100 * 2π`
    - When `plagiarismScore === 0`, draw a single full-circle arc in blue with no red segment
    - Draw a white filled circle in the centre to create the donut hole
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

  - [ ] 9.2 Implement the legend below the donut chart
    - Render "Original Content — X%" in blue and "Matched Content — Y%" in red
    - _Requirements: 1.3, 1.4_

  - [ ]* 9.3 Write property test for donut chart arc angles (Property 1)
    - `// Feature: professional-pdf-report, Property 1: Donut chart segment colours always match originality score`
    - Generate `originalityScore` in `[0, 100]`; assert blue arc angular extent `=== originalityScore / 100 * 2π` and arcs sum to `2π`
    - **Property 1: Donut arc colour/angle correctness**
    - **Validates: Requirements 1.2, 1.5**
    - _Requirements: 1.2, 1.5_

  - [ ]* 9.4 Write property test for donut legend percentages (Property 2)
    - `// Feature: professional-pdf-report, Property 2: Donut chart legend percentages are consistent with the score`
    - Generate `originalityScore`; assert legend text contains `String(originalityScore)` and `String(100 - originalityScore)`
    - **Property 2: Donut legend percentage consistency**
    - **Validates: Requirements 1.4**
    - _Requirements: 1.4_

  - [ ]* 9.5 Write unit test for zero-plagiarism donut
    - Assert that when `plagiarismScore === 0`, exactly one arc path is drawn and it uses blue — no red arc
    - _Requirements: 1.5_

- [~] 10. Implement section renderer: `drawSourceDistributionChart`
  - Accept `(engine, chartData: BarDatum[])` — renders horizontal bar chart from `getSourceChartData` output
  - When `chartData` is empty, render placeholder `"No source data available."`
  - Scale bars: domain with highest count fills `MAX_BAR_WIDTH`; all others proportional
  - Draw bar label and match-count text alongside each bar
  - Call `engine.checkPageBreak` for each bar row
  - _Requirements: 2.1, 2.3, 2.4, 2.5_

  - [ ]* 10.1 Write property test for bar width proportionality (Property 5)
    - `// Feature: professional-pdf-report, Property 5: Bar widths are proportional to match counts`
    - Generate non-empty domain-count maps; assert `barWidth / MAX_BAR_WIDTH === domainCount / maxDomainCount` within float tolerance
    - **Property 5: Bar width proportionality**
    - **Validates: Requirements 2.3**
    - _Requirements: 2.3_

- [~] 11. Implement section renderer: `drawSimilarityTypeChart`
  - Accept `(engine, counts: ReturnType<typeof getSimilarityTypeCounts>)` — renders three vertical bars
  - Colours: Exact Match → `colors.danger`; Slight Changes → `colors.warning`; Paraphrased → `colors.primary`
  - Draw numeric count above each bar; render bars at zero height (not omitted) when all counts are zero
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 11.1 Write unit test for similarity type chart colours
    - Assert the three bars use exactly the three specified RGB values (Requirements 3.2)
    - _Requirements: 3.2_

  - [ ]* 11.2 Write unit test for zero-count chart
    - Assert all three labelled bars render even when all counts are 0 (Requirements 3.4)
    - _Requirements: 3.4_

- [~] 12. Implement section renderer: `drawComparisonSection`
  - [ ] 12.1 Implement the two-column comparison block for a single `MatchDetail`
    - Call `engine.checkPageBreak(estimatedHeight)` — if the entire block doesn't fit, begin on a new page (Requirements 9.4)
    - Left panel: background rect in `colors.redTint`, blue left-border accent, heading "Your Document", text from `truncateText(matchedText, 400)`
    - Right panel: background rect in `colors.amberTint`, red left-border accent, heading "Matched Source", source URL label, text from `truncateText(stripHtml(highlightedSnippet || matchedText), 400)`
    - Draw background rectangles before overlying text (Requirements 5.3)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3_

  - [ ]* 12.2 Write property test for right-panel source selection (Property 8)
    - `// Feature: professional-pdf-report, Property 8: Right panel always uses highlightedSnippet with matchedText fallback`
    - Generate `{ matchedText, highlightedSnippet? }` combos; assert right panel uses `stripHtml(highlightedSnippet)` when non-empty, else `matchedText`
    - **Property 8: Right panel source selection**
    - **Validates: Requirements 4.3, 8.2, 8.3**
    - _Requirements: 4.3, 8.2, 8.3_

  - [ ]* 12.3 Write property test for comparison section count (Property 7)
    - `// Feature: professional-pdf-report, Property 7: Every match produces exactly one comparison section`
    - Generate `MatchDetail[]` of length N; assert the renderer is called exactly N times
    - **Property 7: Comparison section count equals match count**
    - **Validates: Requirements 4.1**
    - _Requirements: 4.1_

  - [ ]* 12.4 Write unit test for "Unknown Source" fallback label
    - Assert `drawComparisonSection` renders `"Unknown Source"` when `MatchDetail.sourceUrl` is absent (Requirements 4.6)
    - _Requirements: 4.6_

  - [ ]* 12.5 Write unit test for background rectangles drawn before text
    - Assert draw order: background rect call precedes text call in each panel (Requirements 5.1, 5.2)
    - _Requirements: 5.1, 5.2_

- [ ] 13. Checkpoint — all section renderers
  - Ensure all tests pass; ask the user if questions arise.

- [~] 14. Implement section renderer: `drawRecommendations`
  - Accept `(engine, recommendations: string[])` — renders each bullet with a `"•"` prefix
  - Call `engine.checkPageBreak` before the block and wrap long lines
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 14.1 Write unit test for zero-match recommendations
    - Assert at least one bullet renders when `matches` is empty (Requirements 7.3)
    - _Requirements: 7.3_

- [~] 15. Wire everything together in `generatePDFReport`
  - [ ] 15.1 Rewrite the main orchestration body
    - Call `resolveBranding()` to get `BrandingConfig`
    - Clamp `originalityScore` to `[0, 100]`
    - Construct `PdfLayoutEngine`; call `drawHeader` on the first page
    - Call `drawExecutiveSummary`, `drawDonutChart`, `drawSourceDistributionChart`, `drawSimilarityTypeChart`
    - Iterate `matches`; call `drawComparisonSection` for each (renders empty placeholder when `matches.length === 0`)
    - Call `drawRecommendations`
    - Call `engine.finaliseFooters()`
    - Set `link.download` to `branding.downloadFilename(jobId)`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.8, 6.5, 9.1, 9.2_

  - [ ]* 15.2 Write property test for branding in header (Property 11)
    - `// Feature: professional-pdf-report, Property 11: Branding values appear verbatim in the header`
    - Generate arbitrary non-empty `appName` / `appTagline` pairs; assert header draw calls include those exact strings on every page
    - **Property 11: Branding verbatim in header**
    - **Validates: Requirements 6.1, 6.2, 9.3**
    - _Requirements: 6.1, 6.2, 9.3_

  - [ ]* 15.3 Write property test for no-content-below-margin (Property 14)
    - `// Feature: professional-pdf-report, Property 14: No content drawn below the bottom margin`
    - Generate varied report data; assert every draw operation's `y` coordinate ≥ `MARGIN` (50 pt)
    - **Property 14: No content below bottom margin**
    - **Validates: Requirements 9.1, 9.4**
    - _Requirements: 9.1, 9.4_

  - [ ]* 15.4 Write property test for page footer correctness (Property 15)
    - `// Feature: professional-pdf-report, Property 15: Every page has a "Page N of M" footer with correct values`
    - Generate multi-match reports producing M pages; assert every page index i has footer `"Page " + (i+1) + " of " + M`
    - **Property 15: Page footer correctness**
    - **Validates: Requirements 9.2**
    - _Requirements: 9.2_

  - [ ]* 15.5 Write unit test for page numbers after `finaliseFooters`
    - Assert single-page report has `"Page 1 of 1"` centred at bottom (Requirements 9.2)
    - _Requirements: 9.2_

  - [ ]* 15.6 Write unit test for empty-matches placeholders
    - Assert `"No source data available."` and `"No matches found in this document."` both appear when `matches` is `[]` (Requirements 2.5, 4.8)
    - _Requirements: 2.5, 4.8_

- [~] 16. Fix duplicate snippet bug in `MatchedSourcesTable`
  - [ ] 16.1 Add `highlightedSnippet` field to the `DerivedSource` interface
    - Add `highlightedSnippet: string` to the `DerivedSource` interface in `components/reports/matched-sources-table.tsx`
    - Populate it from `m.highlightedSnippet || ""` in the `useMemo` derivation
    - _Requirements: 8.1, 8.2_

  - [ ] 16.2 Update the expanded-row right panel to use `highlightedSnippet`
    - Change the right panel content from `{item.snippet}` to `{item.highlightedSnippet || item.snippet}`
    - The left panel continues to use `{item.snippet}` (which is `matchedText`)
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 16.3 Write unit tests for expanded row panels
    - Test: left panel renders `matchedText` (Requirements 8.1)
    - Test: right panel renders `highlightedSnippet` when provided (Requirements 8.2)
    - Test: both panels show different content when `highlightedSnippet !== matchedText` (Requirements 8.3)
    - _Requirements: 8.1, 8.2, 8.3_

- [~] 17. Final checkpoint — run build
  - Run `npm run build` (or `npx tsc --noEmit`) and confirm zero TypeScript errors
  - Ensure all tests pass; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- fast-check must be installed (Task 1) before any property test tasks run
- `drawHeader` must accept a `PdfContext` / branding reference — no hard-coded strings anywhere in the renderer
- The donut chart uses `pdf-lib` arc primitives only — no external charting library (Requirement 1.6)
- `originalityScore` is clamped to `[0, 100]` before any geometric computation to prevent degenerate arcs
- The public signature `generatePDFReport(jobId: string): Promise<void>` is unchanged

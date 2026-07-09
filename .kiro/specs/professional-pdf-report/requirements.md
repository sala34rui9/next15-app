# Requirements Document

## Introduction

The application currently generates PDF reports using `pdf-lib` with raw coordinate-based drawing (`utils/pdf-generator.ts`). The web dashboard renders rich, professional React components — a donut chart for content composition, bar charts for source distribution and similarity type, a synchronized side-by-side comparison viewer, and an expandable matched-sources table with per-row snippet comparison.

The PDF output does not match this quality. It has no charts, no text comparison, no visual highlighting, hard-coded branding, and static recommendation text regardless of the actual scan results. Additionally, the matched-sources table component contains a bug where the "Matched Text (Source)" panel renders the same field as "Original Text (Your Document)" instead of the correct `highlightedSnippet` field.

This feature closes every identified gap so that the exported PDF is a faithful, professional representation of the web dashboard.

---

## Glossary

- **PDF_Generator**: The module located at `utils/pdf-generator.ts` responsible for building and downloading PDF reports.
- **Report_Data**: The `FetchReportResponse` object containing `originalityScore`, `wordCount`, `matches`, and `summary`.
- **MatchDetail**: A single matched source entry containing `similarityScore`, `matchedText`, `highlightedSnippet`, `sourceUrl`, and `sourceName`.
- **Originality_Score**: A percentage (0–100) representing the share of the document that is original. Derived from `FetchReportResponse.originalityScore`.
- **Plagiarism_Score**: `100 − Originality_Score`, representing the percentage of matched content.
- **Comparison_Section**: The side-by-side two-column layout in the PDF that shows matched document text alongside matched source text.
- **Donut_Chart**: A circular chart with a hollow centre rendered directly in the PDF using `pdf-lib` arc/path primitives.
- **Source_Distribution_Chart**: A horizontal bar chart rendered in the PDF showing the top matched domains/sources by match count.
- **Similarity_Type_Chart**: A vertical bar chart rendered in the PDF categorising matches as Exact Match, Slight Changes, or Paraphrased.
- **Risk_Level**: A derived label — `High` when `Originality_Score < 50`, `Medium` when `50 ≤ Originality_Score < 80`, `Low` otherwise.
- **Match_Type**: A derived label per match — `Exact Match` when `similarityScore ≥ 95`, `Slight Changes` when `similarityScore ≥ 80`, `Paraphrased` otherwise.
- **App_Name**: The application display name resolved from the `NEXT_PUBLIC_APP_NAME` environment variable, defaulting to `"Plagiarism Guard"` when the variable is absent or empty.
- **App_Tagline**: The application tagline resolved from the `NEXT_PUBLIC_APP_TAGLINE` environment variable, defaulting to `"DETECT • PROTECT • VERIFY"` when the variable is absent or empty.
- **Highlighted_Snippet**: The `highlightedSnippet` field of a `MatchDetail`; the text extracted from the matched source, possibly containing HTML `<b>` tags for emphasis.
- **Download_Filename**: The name of the file triggered for download, composed from `App_Name` and the `jobId`.

---

## Requirements

### Requirement 1: Visual Donut Chart for Content Composition

**User Story:** As a user downloading a report, I want a visual donut chart showing original vs matched content, so that I can instantly grasp the plagiarism level without reading numbers.

#### Acceptance Criteria

1. THE `PDF_Generator` SHALL render a Donut_Chart on the first page of every generated PDF report.
2. WHEN `Originality_Score` is greater than or equal to 0 and less than or equal to 100, THE `PDF_Generator` SHALL draw the original segment using the primary blue colour (`rgb(0.1, 0.4, 0.8)`) and the matched segment using the danger red colour (`rgb(0.9, 0.2, 0.2)`).
3. THE `PDF_Generator` SHALL label the Donut_Chart with the text "Content Composition" as a section heading above the chart.
4. THE `PDF_Generator` SHALL render a legend below the Donut_Chart identifying the "Original Content" and "Matched Content" segments with their respective colours and percentage values.
5. WHEN `Plagiarism_Score` equals 0, THE `PDF_Generator` SHALL render the Donut_Chart as a full circle in the primary blue colour with no red segment.
6. THE `PDF_Generator` SHALL draw the Donut_Chart using `pdf-lib` path/arc primitives without importing any external charting library.

---

### Requirement 2: Source Distribution Bar Chart

**User Story:** As a user downloading a report, I want a horizontal bar chart showing which domains contributed the most matches, so that I can identify the primary plagiarism sources at a glance.

#### Acceptance Criteria

1. THE `PDF_Generator` SHALL render a Source_Distribution_Chart displaying the top 5 matched domains or source names sorted in descending order by match count.
2. WHEN a `MatchDetail.sourceUrl` is a valid URL, THE `PDF_Generator` SHALL extract the hostname (with `www.` prefix removed) as the label; otherwise THE `PDF_Generator` SHALL use `MatchDetail.sourceName`, falling back to `"Unknown"`.
3. THE `PDF_Generator` SHALL scale each horizontal bar so that the domain with the highest match count fills the maximum available bar width, and all other bars are proportional.
4. THE `PDF_Generator` SHALL render each bar label and match count as text alongside its bar.
5. WHEN no matches are present, THE `PDF_Generator` SHALL render the placeholder text "No source data available." in place of the chart.

---

### Requirement 3: Similarity Type Bar Chart

**User Story:** As a user downloading a report, I want a chart categorising matches by type (exact, slight, paraphrased), so that I understand the nature of the detected plagiarism.

#### Acceptance Criteria

1. THE `PDF_Generator` SHALL render a Similarity_Type_Chart with three vertical bars labelled "Exact Match", "Slight Changes", and "Paraphrased".
2. THE `PDF_Generator` SHALL colour the "Exact Match" bar using the danger red colour, the "Slight Changes" bar using the warning amber colour (`rgb(0.9, 0.6, 0.1)`), and the "Paraphrased" bar using the primary blue colour.
3. THE `PDF_Generator` SHALL display the numeric count above each bar.
4. WHEN all three counts are zero, THE `PDF_Generator` SHALL still render the three labelled bars at zero height rather than omitting the chart.

---

### Requirement 4: Side-by-Side Text Comparison Section

**User Story:** As a user downloading a report, I want a side-by-side view of my document text alongside the matched source text for each match, so that I can directly compare the two without visiting the web app.

#### Acceptance Criteria

1. THE `PDF_Generator` SHALL render a Comparison_Section for every `MatchDetail` entry in `Report_Data.matches`.
2. WHEN rendering the left panel of the Comparison_Section, THE `PDF_Generator` SHALL display `MatchDetail.matchedText` as plain text under the heading "Your Document".
3. WHEN rendering the right panel of the Comparison_Section, THE `PDF_Generator` SHALL display `MatchDetail.highlightedSnippet` (falling back to `MatchDetail.matchedText` when `highlightedSnippet` is absent or empty) as plain text under the heading "Matched Source".
4. THE `PDF_Generator` SHALL strip HTML tags (e.g., `<b>`, `</b>`) from `Highlighted_Snippet` before rendering the text in the PDF.
5. THE `PDF_Generator` SHALL render a coloured left-border accent on the left panel using the primary blue colour and on the right panel using the danger red colour to visually distinguish the two sides.
6. THE `PDF_Generator` SHALL include the source URL (or "Unknown Source" when absent) as a small label beneath the right-panel heading.
7. WHEN a `MatchDetail.matchedText` value exceeds 400 characters, THE `PDF_Generator` SHALL truncate the displayed text to 400 characters and append "…".
8. WHEN `Report_Data.matches` is empty, THE `PDF_Generator` SHALL render the placeholder text "No matches found in this document." in place of the Comparison_Section.

---

### Requirement 5: Match Highlighting via Background Shading

**User Story:** As a user downloading a report, I want matched text regions visually distinguished with background shading, so that I can identify plagiarised passages at a glance.

#### Acceptance Criteria

1. THE `PDF_Generator` SHALL draw a filled background rectangle behind each matched text block in the left panel of the Comparison_Section using a red tint (`rgb(0.98, 0.92, 0.92)`).
2. THE `PDF_Generator` SHALL draw a filled background rectangle behind each matched text block in the right panel of the Comparison_Section using an amber tint (`rgb(0.99, 0.96, 0.88)`).
3. THE `PDF_Generator` SHALL ensure background rectangles are drawn before the overlying text so that text remains readable.

---

### Requirement 6: Dynamic Branding

**User Story:** As an operator deploying this application under a custom brand, I want the PDF header to reflect the configured application name and tagline, so that downloaded reports carry the correct branding.

#### Acceptance Criteria

1. WHEN generating a PDF header, THE `PDF_Generator` SHALL use `App_Name` as the header title.
2. WHEN generating a PDF header, THE `PDF_Generator` SHALL use `App_Tagline` as the subtitle beneath the header title.
3. WHEN `NEXT_PUBLIC_APP_NAME` is absent or empty, THE `PDF_Generator` SHALL default to `"Plagiarism Guard"`.
4. WHEN `NEXT_PUBLIC_APP_TAGLINE` is absent or empty, THE `PDF_Generator` SHALL default to `"DETECT • PROTECT • VERIFY"`.
5. THE `PDF_Generator` SHALL use `App_Name` (lowercased, spaces replaced with hyphens) as the prefix of the Download_Filename, followed by `"_Report_"` and the `jobId`.

---

### Requirement 7: Data-Driven Recommendations

**User Story:** As a user reviewing my PDF report, I want the recommendations section to reflect the actual scan results, so that the advice is actionable and relevant to my document.

#### Acceptance Criteria

1. WHEN `Risk_Level` equals `"High"`, THE `PDF_Generator` SHALL include the recommendation: "Significant plagiarism detected. Review all exact and high-similarity matches and add proper citations."
2. WHEN `Risk_Level` equals `"Medium"`, THE `PDF_Generator` SHALL include the recommendation: "Moderate similarity detected. Consider rewording paraphrased sections and verify citation formatting."
3. WHEN `Risk_Level` equals `"Low"`, THE `PDF_Generator` SHALL include the recommendation: "Originality is strong. Perform a final review of any flagged sources before submission."
4. WHEN at least one `MatchDetail` has a `Match_Type` of `"Exact Match"`, THE `PDF_Generator` SHALL include the recommendation: "Exact matches found — ensure all quoted material uses proper quotation marks and citations."
5. WHEN all `MatchDetail` entries have a `Match_Type` of `"Paraphrased"`, THE `PDF_Generator` SHALL include the recommendation: "All matches are paraphrased. Rewrite flagged sections in your own voice or add attributions."
6. THE `PDF_Generator` SHALL render at least one recommendation and no more than four recommendations per report.

---

### Requirement 8: Fix Duplicate Snippet Bug in Matched Sources Table

**User Story:** As a user expanding a matched source row in the web dashboard, I want to see my document text on the left and the actual source text on the right, so that I can compare them meaningfully.

#### Acceptance Criteria

1. WHEN a row in the `MatchedSourcesTable` component is expanded, THE `MatchedSourcesTable` SHALL display `MatchDetail.matchedText` in the "Original Text (Your Document)" panel.
2. WHEN a row in the `MatchedSourcesTable` component is expanded, THE `MatchedSourcesTable` SHALL display `MatchDetail.highlightedSnippet` (falling back to `MatchDetail.matchedText` when `highlightedSnippet` is absent or empty) in the "Matched Text (Source)" panel.
3. THE `MatchedSourcesTable` SHALL NOT display the same content in both the "Original Text" and "Matched Text" panels when `highlightedSnippet` and `matchedText` differ.

---

### Requirement 9: Page Layout and Multi-Page Support

**User Story:** As a user receiving a multi-source report, I want the PDF to flow correctly across multiple pages without content being clipped, so that all findings are fully readable.

#### Acceptance Criteria

1. THE `PDF_Generator` SHALL insert a page break and carry forward the header when any section would overflow below the bottom margin.
2. THE `PDF_Generator` SHALL render page numbers in the format "Page N of M" centred at the bottom of every page.
3. THE `PDF_Generator` SHALL render the header (App_Name, App_Tagline, date, and report ID) on every page.
4. WHEN the Comparison_Section for a single `MatchDetail` would overflow the remaining space on a page, THE `PDF_Generator` SHALL begin that match's comparison block on a new page rather than splitting it mid-block.

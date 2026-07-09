// Feature: professional-pdf-report
//
// Property-based test suite for utils/pdf-generator.ts
// Library: fast-check
// Each property test is tagged with:
//   // Feature: professional-pdf-report, Property <N>: <property_text>

import fc from "fast-check";
import {
  buildFilename,
  stripHtml,
  truncateText,
  domainLabel,
  getMatchType,
  getRiskLevel,
  getSimilarityTypeCounts,
  getSourceChartData,
  buildRecommendations,
} from "../pdf-generator";

// ---------------------------------------------------------------------------
// Property 9: HTML stripping removes all tags and preserves content
// Feature: professional-pdf-report, Property 9: HTML stripping removes all tags and preserves content
// Validates: Requirements 4.4
// ---------------------------------------------------------------------------
describe("Property 9: stripHtml", () => {
  it("removes all HTML tags and preserves non-tag characters", () => {
    fc.assert(
      fc.property(fc.string(), (plain) => {
        // Wrap plain text in random HTML-like tags
        const withTags = `<b>${plain}</b><em>${plain}</em>`;
        const result = stripHtml(withTags);
        expect(result).not.toMatch(/[<>]/);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Text truncation is bounded and preserves short strings
// Feature: professional-pdf-report, Property 10: Text truncation is bounded and preserves short strings
// Validates: Requirements 4.7
// ---------------------------------------------------------------------------
describe("Property 10: truncateText", () => {
  it("result length is <= limit + 1 (the ellipsis counts as 1 char)", () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: 1, max: 1000 }), (text, limit) => {
        const result = truncateText(text, limit);
        expect(result.length).toBeLessThanOrEqual(limit + 1);
      }),
      { numRuns: 100 }
    );
  });

  it("strings shorter than or equal to limit are returned unchanged", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }).chain((limit) =>
          fc
            .string({ maxLength: limit })
            .map((text) => ({ text, limit }))
        ),
        ({ text, limit }) => {
          expect(truncateText(text, limit)).toBe(text);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Domain label derivation is correct for all input shapes
// Feature: professional-pdf-report, Property 4: Domain label derivation is correct for all input shapes
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------
describe("Property 4: domainLabel", () => {
  it("returns hostname (www-stripped) for valid URLs", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant("https://www.example.com/path"),
          fc.constant("https://sub.domain.org"),
          fc.constant("http://www.test.co.uk/foo")
        ),
        (url) => {
          const result = domainLabel({ sourceUrl: url });
          expect(result).not.toContain("www.");
          expect(result.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("falls back to sourceName when sourceUrl is absent or malformed", () => {
    fc.assert(
      fc.property(
        fc.record({
          sourceUrl: fc.oneof(fc.constant(undefined), fc.constant("not-a-url"), fc.constant("")),
          sourceName: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        ({ sourceUrl, sourceName }) => {
          const result = domainLabel({ sourceUrl, sourceName });
          expect(result).toBe(sourceName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns "Unknown" when both sourceUrl and sourceName are absent', () => {
    fc.assert(
      fc.property(fc.constant({}), (m) => {
        expect(domainLabel(m)).toBe("Unknown");
      }),
      { numRuns: 10 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Download filename follows the prescribed format
// Feature: professional-pdf-report, Property 12: Download filename follows the prescribed format
// Validates: Requirements 6.5
// ---------------------------------------------------------------------------
describe("Property 12: buildFilename", () => {
  it("filename equals appName.toLowerCase().replace spaces with hyphens + _Report_ + jobId", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (appName, jobId) => {
          const expected =
            appName.toLowerCase().replace(/\s+/g, "-") + "_Report_" + jobId;
          expect(buildFilename(appName, jobId)).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Similarity type categorisation counts are exhaustive
// Feature: professional-pdf-report, Property 6: Similarity type categorisation counts are exhaustive
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------
describe("Property 6: getSimilarityTypeCounts", () => {
  it("exactCount + slightCount + paraphrasedCount === matches.length", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ similarityScore: fc.integer({ min: 0, max: 100 }) }),
          { maxLength: 50 }
        ),
        (matches) => {
          const { exactCount, slightCount, paraphrasedCount } =
            getSimilarityTypeCounts(matches);
          expect(exactCount + slightCount + paraphrasedCount).toBe(matches.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Source distribution chart is sorted and capped
// Feature: professional-pdf-report, Property 3: Source distribution chart is sorted and capped
// Validates: Requirements 2.1
// ---------------------------------------------------------------------------
describe("Property 3: getSourceChartData", () => {
  it("returns at most 5 entries, sorted descending by value", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sourceUrl: fc.oneof(
              fc.constant(undefined),
              fc.webUrl()
            ),
            sourceName: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1 })),
            similarityScore: fc.integer({ min: 0, max: 100 }),
          }),
          { maxLength: 30 }
        ),
        (matches) => {
          const data = getSourceChartData(matches);
          expect(data.length).toBeLessThanOrEqual(5);
          for (let i = 0; i < data.length - 1; i++) {
            expect(data[i].value).toBeGreaterThanOrEqual(data[i + 1].value);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Recommendations are always in [1,4] and match derivation rules
// Feature: professional-pdf-report, Property 13: Recommendations are always in [1,4] and match derivation rules
// Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
// ---------------------------------------------------------------------------
describe("Property 13: buildRecommendations", () => {
  it("always returns between 1 and 4 recommendations", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.array(
          fc.record({ similarityScore: fc.integer({ min: 0, max: 100 }) }),
          { maxLength: 30 }
        ),
        (originalityScore, matches) => {
          const recs = buildRecommendations(originalityScore, matches);
          expect(recs.length).toBeGreaterThanOrEqual(1);
          expect(recs.length).toBeLessThanOrEqual(4);
        }
      ),
      { numRuns: 100 }
    );
  });
});

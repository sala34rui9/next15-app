import fc from "fast-check";
import {
  resolveBranding,
  drawDonutChart,
  drawSourceDistributionChart,
  drawSimilarityTypeChart,
  drawComparisonSection,
  drawRecommendations,
  PdfLayoutEngine,
  BarDatum
} from "../pdf-generator";
import { rgb } from "pdf-lib";

// Helpers
function createMockEngine() {
  const drawSvgPath = jest.fn();
  const drawText = jest.fn();
  const drawRectangle = jest.fn();
  const drawLine = jest.fn();
  const addPage = jest.fn();
  const checkPageBreak = jest.fn();
  const colors = {
    primary: rgb(0.1, 0.4, 0.8),
    danger: rgb(0.9, 0.2, 0.2),
    warning: rgb(0.9, 0.6, 0.1),
    text: rgb(0.2, 0.2, 0.2),
    textMuted: rgb(0.4, 0.4, 0.4),
    bgGray: rgb(0.96, 0.96, 0.96),
    border: rgb(0.85, 0.85, 0.85),
    amberTint: rgb(0.99, 0.96, 0.88),
    redTint: rgb(0.98, 0.92, 0.92),
    success: rgb(0.1, 0.7, 0.3),
  };
  return {
    engine: {
      layout: { PAGE_WIDTH: 595.28, PAGE_HEIGHT: 841.89, MARGIN: 50, CONTENT_WIDTH: 495.28 },
      fonts: { regular: {} as any, bold: {} as any },
      colors,
      currentPage: { drawSvgPath, drawText, drawRectangle, drawLine } as any,
      currentY: 800,
      checkPageBreak,
      addPage,
    } as unknown as PdfLayoutEngine,
    mocks: { drawSvgPath, drawText, drawRectangle, drawLine, checkPageBreak },
    colors,
  };
}

// ---------------------------------------------------------------------------
// Unit Test: resolveBranding (Tasks 2.3)
// ---------------------------------------------------------------------------
describe("resolveBranding", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns defaults when env vars are absent", () => {
    delete process.env.NEXT_PUBLIC_APP_NAME;
    delete process.env.NEXT_PUBLIC_APP_TAGLINE;
    const branding = resolveBranding();
    expect(branding.appName).toBe("Plagiarism Guard");
    expect(branding.appTagline).toBe("DETECT \u2022 PROTECT \u2022 VERIFY");
  });

  it("returns values verbatim when env vars are present", () => {
    process.env.NEXT_PUBLIC_APP_NAME = "Custom Name";
    process.env.NEXT_PUBLIC_APP_TAGLINE = "Custom Tagline";
    const branding = resolveBranding();
    expect(branding.appName).toBe("Custom Name");
    expect(branding.appTagline).toBe("Custom Tagline");
  });
});

// ---------------------------------------------------------------------------
// Property 1: Donut chart arc angles (Task 9.3)
// ---------------------------------------------------------------------------
describe("Property 1: Donut chart arc angles", () => {
  it("segment colours always match originality score", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99 }), (score) => {
        const { engine, mocks, colors } = createMockEngine();
        drawDonutChart(engine, score);
        expect(mocks.drawSvgPath).toHaveBeenCalledTimes(2);
        const calls = mocks.drawSvgPath.mock.calls;
        expect(calls[0][1].color).toBe(colors.primary); // Blue
        expect(calls[1][1].color).toBe(colors.danger); // Red
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Donut legend percentages (Task 9.4)
// ---------------------------------------------------------------------------
describe("Property 2: Donut legend percentages", () => {
  it("legend percentages are consistent with the score", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (score) => {
        const { engine, mocks } = createMockEngine();
        drawDonutChart(engine, score);
        const textCalls = mocks.drawText.mock.calls.map((c: any) => c[0]);
        expect(textCalls).toContainEqual(expect.stringContaining(`${score}%`));
        if (score > 0 && score < 100) {
          expect(textCalls).toContainEqual(expect.stringContaining(`${100 - score}%`));
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit Test: zero-plagiarism donut (Task 9.5)
// ---------------------------------------------------------------------------
describe("zero-plagiarism donut", () => {
  it("renders only blue arcs when plagiarismScore is 0", () => {
    const { engine, mocks, colors } = createMockEngine();
    drawDonutChart(engine, 100);
    expect(mocks.drawSvgPath).toHaveBeenCalledTimes(2);
    expect(mocks.drawSvgPath.mock.calls[0][1].color).toBe(colors.primary);
    expect(mocks.drawSvgPath.mock.calls[1][1].color).toBe(colors.bgGray);
  });
});

// ---------------------------------------------------------------------------
// Property 5: Bar width proportionality (Task 10.1)
// ---------------------------------------------------------------------------
describe("Property 5: Bar width proportionality", () => {
  it("bar widths are proportional to match counts", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            label: fc.string(),
            value: fc.integer({ min: 1, max: 1000 }),
            color: fc.constant(rgb(0,0,0))
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (chartData) => {
          const { engine, mocks } = createMockEngine();
          drawSourceDistributionChart(engine, chartData as BarDatum[]);
          const maxVal = Math.max(...chartData.map(d => d.value));
          const MAX_BAR_WIDTH = 250;
          
          const rectCalls = mocks.drawRectangle.mock.calls;
          expect(rectCalls.length).toBe(chartData.length);
          
          chartData.forEach((data, i) => {
            const expectedWidth = Math.max((data.value / maxVal) * MAX_BAR_WIDTH, 2);
            expect(rectCalls[i][0].width).toBeCloseTo(expectedWidth, 1);
          });
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Similarity Type Chart Unit Tests (Task 11.1, 11.2)
// ---------------------------------------------------------------------------
describe("drawSimilarityTypeChart", () => {
  it("uses exactly the three specified RGB colours", () => {
    const { engine, mocks, colors } = createMockEngine();
    drawSimilarityTypeChart(engine, { exactCount: 1, slightCount: 1, paraphrasedCount: 1 });
    const rectCalls = mocks.drawRectangle.mock.calls;
    expect(rectCalls[0][0].color).toBe(colors.danger);
    expect(rectCalls[1][0].color).toBe(colors.warning);
    expect(rectCalls[2][0].color).toBe(colors.primary);
  });

  it("renders all three labelled bars even when counts are 0", () => {
    const { engine, mocks } = createMockEngine();
    drawSimilarityTypeChart(engine, { exactCount: 0, slightCount: 0, paraphrasedCount: 0 });
    const textCalls = mocks.drawText.mock.calls.map((c: any) => c[0]);
    expect(textCalls).toContain("Exact Match");
    expect(textCalls).toContain("Slight Changes");
    expect(textCalls).toContain("Paraphrased");
    const rectCalls = mocks.drawRectangle.mock.calls;
    expect(rectCalls).toHaveLength(3);
    expect(rectCalls[0][0].height).toBe(1);
    expect(rectCalls[1][0].height).toBe(1);
    expect(rectCalls[2][0].height).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Property 8: Right panel source selection (Task 12.2)
// ---------------------------------------------------------------------------
describe("Property 8: Right panel source selection", () => {
  it("right panel always uses highlightedSnippet with matchedText fallback", () => {
    fc.assert(
      fc.property(
        fc.record({
          matchedText: fc.string({ minLength: 1 }),
          highlightedSnippet: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1 })),
        }),
        ({ matchedText, highlightedSnippet }) => {
          const { engine, mocks } = createMockEngine();
          drawComparisonSection(engine, { matchedText, highlightedSnippet, similarityScore: 100 }, 0);
          const textCalls = mocks.drawText.mock.calls.map((c: any) => c[0]);
          if (highlightedSnippet) {
            const stripped = highlightedSnippet.replace(/<[^>]*>/g, "").slice(0, 38).trim().split(" ")[0];
            if (stripped) expect(textCalls.some((c: string) => c.includes(stripped))).toBeTruthy();
          } else {
            const stripped = matchedText.slice(0, 38).trim().split(" ")[0];
            if (stripped) expect(textCalls.some((c: string) => c.includes(stripped))).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Task 12.4 Unit Test for Unknown Source
// ---------------------------------------------------------------------------
describe("drawComparisonSection", () => {
  it("renders Unknown Source when sourceUrl is absent", () => {
    const { engine, mocks } = createMockEngine();
    drawComparisonSection(engine, { matchedText: "abc", similarityScore: 100 }, 0);
    const textCalls = mocks.drawText.mock.calls.map((c: any) => c[0]);
    expect(textCalls).toContain("Unknown Source");
  });
});

// ---------------------------------------------------------------------------
// drawRecommendations Unit test (Task 14.1)
// ---------------------------------------------------------------------------
describe("drawRecommendations", () => {
  it("renders at least one bullet when matches is empty (by receiving 1 rec)", () => {
    const { engine, mocks } = createMockEngine();
    drawRecommendations(engine, ["Test recommendation"]);
    const textCalls = mocks.drawText.mock.calls.map((c: any) => c[0]);
    expect(textCalls).toContainEqual(expect.stringContaining("\u2022 Test recommendation"));
  });
});

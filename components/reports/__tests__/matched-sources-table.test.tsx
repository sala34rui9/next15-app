import { render, screen, fireEvent, within } from "@testing-library/react";
import { MatchedSourcesTable } from "../matched-sources-table";

describe("MatchedSourcesTable", () => {
  const matches = [
    {
      sourceUrl: "https://example.com",
      sourceName: "Example",
      similarityScore: 100,
      matchedText: "This is the original text from the user document.",
      highlightedSnippet: "This is the <mark>highlighted</mark> snippet from the source.",
    },
    {
      sourceUrl: "https://example2.com",
      sourceName: "Example 2",
      similarityScore: 50,
      matchedText: "Both panels use this text since snippet is absent.",
    }
  ];

  it("left panel renders matchedText (Requirements 8.1)", () => {
    render(<MatchedSourcesTable matches={matches} />);
    // Expand the first row
    const rows = screen.getAllByRole("row");
    fireEvent.click(rows[1]); // rows[0] is header, rows[1] is the first item
    
    // The left panel has a heading "Original Text (Your Document)"
    const leftHeading = screen.getByText("Original Text (Your Document)");
    const leftContainer = leftHeading.parentElement;
    expect(within(leftContainer as HTMLElement).getByText(/original text from the user document/i)).toBeTruthy();
  });

  it("right panel renders highlightedSnippet when provided (Requirements 8.2)", () => {
    render(<MatchedSourcesTable matches={matches} />);
    // Expand the first row
    const rows = screen.getAllByRole("row");
    fireEvent.click(rows[1]);
    
    // The right panel has a heading "Matched Text (Source)"
    const rightHeading = screen.getByText("Matched Text (Source)");
    const rightContainer = rightHeading.parentElement;
    expect(within(rightContainer as HTMLElement).getByText(/highlighted.*snippet from the source/i)).toBeTruthy();
  });

  it("both panels show different content when highlightedSnippet !== matchedText (Requirements 8.3)", () => {
    render(<MatchedSourcesTable matches={matches} />);
    const rows = screen.getAllByRole("row");
    fireEvent.click(rows[1]);
    
    const leftHeading = screen.getByText("Original Text (Your Document)");
    const leftContainer = leftHeading.parentElement;
    const rightHeading = screen.getByText("Matched Text (Source)");
    const rightContainer = rightHeading.parentElement;
    
    const leftText = leftContainer?.textContent || "";
    const rightText = rightContainer?.textContent || "";
    
    expect(leftText).not.toEqual(rightText);
  });
});

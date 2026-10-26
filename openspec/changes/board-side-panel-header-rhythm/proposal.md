# Proposal: board-side-panel-header-rhythm

## Why

r31 (26 Oct): DqZakenSorteren's side panel ("Alle zaken") read gapBelowTitle 54.5 live vs 43 on the board. Probed on :8080: the line under the title (a paragraph) was 15px (the theme sets paragraphs with `!important`) and 5px under the title, the header kept 4px under it (tabs at 90 vs 77), and the search field sat 34px under the tab row (16px section padding + 6px field margin + the tab content's 10px) where the boards draw 20.

## What changes

In the board look the index side panel's line under the title is 14px at its normal leading, 2px under the title, through the theme's paragraph tokens; the header ends at that line; the first section starts 8px into the tab content and its field has no top margin. Probed live by injection: title 20, line 46-63, tabs 77-117, search field 137-177, exactly as DqZakenSorteren and DqFilterBeheren draw them. No schema change.

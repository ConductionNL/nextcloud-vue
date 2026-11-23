# Proposal: board-narrow-select-fits-choice

## Why

DqWerkbord draws "Zaaktype: [Woo-verzoek ⌄]" about 130px wide. Live drew it 316px: a native select is as wide as its
longest option, and a real catalogue lists every case type, the longest "Leverancier contractverlenging verzoek", where
the board lists three. Probed live on :8080 (23 Oct): Nextcloud's `select { width: auto }` lets the options decide; with
`field-sizing: content` the select fits the chosen type (122px).

## What changes

In the board look the board view's narrowing select ("Zaaktype:") fits the chosen value (`field-sizing: content`), with
room for its caret on the right. The column switch ("Kolommen:") keeps its width, which already matches the board. A
browser without `field-sizing` keeps today's width. No schema change.

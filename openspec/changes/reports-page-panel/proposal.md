---
kind: code
---

# Reports page: one panel of report cards

## Why
Board DqRapportages draws every report as a card in one titled panel: a flat grid, a dashed card for a report that lives in another app, a tinted card for a highlighted report, a grouping line and a link to where the reports are set up. CnReportsPage only knew category sections and the catalogue.

## What changes
- `config.panel` `{ title, subtitle, link }` draws the cards in that panel under the board look. The buildiq square stands in the header without declared buttons.
- A card gains `meta`, `pill`, `tone` (`external`, `highlight`), `linkLabel`, `href` as an alternative to `route`, `query`, and `requiresApp` with `missingText`.
- The default look is unchanged. A card whose `requiresApp` is missing leaves the default layouts and says so in the panel.

# Proposal: macros-widget-titled-card

## Why

Board DqZaakAssistent draws "Macro's" as a titled card under the AI activity card in the AI-toezicht tab. CnMacrosWidget renders no card of its own, and the detail widget host only wraps content-only types in the titled card, so in a tab stack the macros floated as bare text without title, border or background (COMPDIFF r24: card "Macro's" missing on live).

## What changes

- `macros` joins `CONTENT_ONLY_TYPES`: on a detail card surface (a tab stack, the side column, a body grid cell) the host draws its titled card with the manifest title and subtitle, as for record-list or facts.
- Bare mode (a single widget in a tab panel) is unchanged.
- No manifest schema change.

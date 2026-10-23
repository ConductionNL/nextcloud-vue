# Proposal: default-views-secondary

## Why

DqFilterBeheren draws three default views under "Standaardweergaven", each with a line saying what it shows ("Mijn
zaken / Behandelaar is ik"). dossiq ships more default views than that. Ruben (23 Oct): the board's three first, the
rest under "Meer standaardweergaven", folded. A default view also had no way to carry its own line.

## What changes

- A default view (`config.defaultSavedViews[]`) may carry `description` (translated, the line under it) and
  `secondary: true`.
- `CnSavedViewsPanel` lists the secondary defaults behind a "More default views" button (collapsed, `aria-expanded`),
  after the others. They show when the reader opens it, or when the applied view is one of them.

## Scope

nextcloud-vue. Index page config is open, so no schema change. Two new l10n keys (en, nl).

# Proposal: saved-views-default-read-only-pill

## Why

Boards DqFilterBeheren and DqFilterInMenu draw the Default views caption ("Standaardweergaven") with a pill "Alleen lezen"
and a lock icon, and under it the line "Geleverd door ...; een nieuwe versie werkt ze bij." The panel says "Read only."
inside the line and draws no pill. COMPDIFF r24: pill "Alleen lezen" missing on live (2 boards).

## What changes

- The seeded section's caption carries a "Read only" pill with a lock icon.
- The line under it drops the words "Read only." ("Shipped with the app; a new version updates them.").
- Two catalogue keys (en, nl); "Read only" leaves the nl-missing baseline.

## Scope

CnSavedViewsPanel.vue, l10n en/nl, the l10n baseline. No schema change.

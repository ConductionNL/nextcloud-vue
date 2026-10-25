# Proposal: record-list-pill-cases-footer-choice

## Why

Board DqZaaktype draws the case type's Versies card with a pill per version that reads a state from two fields
(Concept for a draft, Vastgezet for a closed version, Actief otherwise), and a footer that depends on the version
open on the page: a published version ends with "Een gepubliceerde versie verandert niet meer. Wijzigen maakt een
nieuwe versie." and "Nieuwe versie maken" across the card, a draft with "Publiceren". CnRecordListWidget reads a
pill from one field and has one footer action.

## What changes

- `content.footerAction` may be a list: the first entry whose `visibleWhen` (a local condition over the page's
  record) holds is drawn; an entry without one always holds. A single entry may carry `visibleWhen` too.
- A footer action takes `note` (a muted line above it) and `wide: true` (the button across the card).
- `content.pill.cases` (`[{ when, label, variant? }]`): the first case whose `when` holds on the row, else the pill's
  own `label` and `variant`.
- Manifest schema 2.154.0: `footerAction` accepts the list, `note`, `wide` and `visibleWhen`.

## Reach

CnRecordListWidget and the manifest schema. Existing configs draw as before.

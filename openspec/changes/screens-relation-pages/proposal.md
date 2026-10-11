---
kind: code
---

# Proposal: screens-relation-pages

## Summary

The person and organisation screens of pipelinq, dossiq and shillinq are the
same page drawn three times: PqContacten / DqContacten (a list of people),
PqKlant / DqContact / PqContactpersoon (one person), PqOrganisaties /
DqOrganisaties / ShLeveranciers (a list of organisations), PqOrganisatie /
DqOrganisatie / ShKlant (one organisation). Ruben's rule of 11 October 2026:
these screens are (almost) identical in the three apps, and each app's version
is manifest configuration over generic widgets. An app component needs a
written reason.

Most of the shape is configurable already: the board header (pills, title,
breadcrumb, meta line, quick actions), the tab strip with counts (`countFrom`,
#1468), the side column, the data card, the History side card, the index
header, lenses, `rowIcon`, a column's `secondary` line. What is missing is
what makes a relation page a relation page:

1. An Overview tab that holds more than one card (the record's data card, then
   its open cases, tickets and recent contact moments). A tab holds one widget.
2. A list of another schema's objects that reference this record, drawn as the
   boards draw them: a row with a bold title, a meta line, a status pill, a date
   and a chevron ("Zaken", "Tickets"); a feed with a channel icon, a meta line and
   the text ("Laatste contactmomenten"); a compact line with a label and a link
   ("Relaties"). The object-list widget draws a table.
3. A facts card for the side column: a lead block (icon or initials, a title, a
   subtitle), address lines, label/value rows whose values are links (mail,
   phone, web), copyable or masked behind a reveal, a note, a link and an
   action. The boards draw it seven times: Bereikbaar via, Identiteit,
   Woonadres, KvK en adres, Hoofdcontact, Contactkanalen, SEPA-machtiging.
4. Header pills that do not come from a field: a constant type ("Inwoner",
   "Vereniging", "Klant") and a count of related work ("1 lopende zaak",
   "2 open tickets"). `headerPill` reads one field.

## What changes

- `CnTabsWidget`: a tab entry takes `widgetIds` (a stack) next to `widgetId`.
- A new `record-list` widget (`CnRecordListWidget`) with three presentations,
  `rows`, `feed` and `inline`, over the same source keys as `object-list`.
- A new `facts` widget (`CnFactsWidget`).
- `headerPill` takes `text`, and `countFrom` with `countLabel`. This is the only
  manifest schema change (version 2.85.0, assigned by the coordinator).
- A documented canonical manifest for a person page and an organisation page
  (design.md), which the apps copy and fill with their register, schema, field
  paths and labels.

Everything is opt-in. A manifest that does not use a new key renders as today.
No app names in the library.

## Out of scope

- Per-row derived counts in a list column ("Open zaken", "Lopende zaken",
  "Laatste contact" on the organisation lists). Recorded as a requirement with
  its own later task, because it is a per-row request pattern that wants its own
  review.
- The app-specific cards (Openstaande deals, Nextcloud Contacten sync,
  Herinneringsschema, Ook leverancier). They are configured from existing
  widgets or stay app widgets with a reason.

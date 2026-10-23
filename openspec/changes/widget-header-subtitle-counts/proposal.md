# Proposal: widget-header-subtitle-counts

## Why

The boards put a list's counts as the muted line under its card title: DqZaakContact "Contactmomenten op deze zaak"
"4 vastgelegd", DqContact and DqOrganisatie "Laatste contactmomenten" "3 in totaal", DqTenant "Inrichten" "5 van 7
stappen klaar", DqTaak "Checklist" "2 van 4 klaar". Live either left the line out, put it on the right of the title row
(record list `headerNote`), or drew it above the items (checklist), so the first content line sat closer to the title
than drawn (COMPDIFF r23 gapBelowTitle). The detail card host already takes a `subtitle` from a renderer's `header`
event; the lists did not offer one.

## What changes

- `fillCountLabel(label, total, rows)`: the `{total}` / `{count:<field>=<value>}` grammar the record list's header texts
  used, as a shared util; CnRecordListWidget's `withTotal` uses it.
- CnRecordListWidget `content.headerSubtitle` and CnObjectListWidget `content.headerSubtitle`: that line, filled with the
  counts and translated, reported as the header's `subtitle`. The object list reports it together with its Download
  action, and reports nothing when it has neither.
- CnChecklistWidget `content.summaryInHeader: true`: "2 of 4 done" is reported as the header's `subtitle` instead of
  drawn above the items.

No schema change: a widget's `content` is not validated key by key.

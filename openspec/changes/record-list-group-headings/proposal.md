# Proposal: record-list-group-headings

## Why

DqZaakGerelateerd draws a case's typed relations in groups, each under a 15px heading: "Onderwerp van deze zaak",
"Wacht op", "Gepland vervolg". CnRecordListWidget draws one flat list, so an app that wants the board's groups has to
build its own widget.

## What changes

CnRecordListWidget takes `content.groupBy` (a field path). With it the list presentations draw one list per value,
each under an `<h3>` heading that names it (`aria-labelledby`). The heading is the field's `valueLabels` entry, else the
value, through the host translate. `groupOrder` orders the groups; `groupEmptyLabel` heads the rows without a value,
which come last. Without `groupBy` the DOM is unchanged.

## Scope

nextcloud-vue only; dossiq configures it on the Related tab (R22-RECORD). WCAG: each group is a list named by its
heading (1.3.1).

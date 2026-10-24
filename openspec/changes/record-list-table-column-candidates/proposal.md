# Proposal: record-list-table-column-candidates

## Why

Board DqSociaalDomein draws "Andere zaken van dit huishouden" as a table:
Zaak, Zaaktype, Status, Zichtbaar voor u. dossiq's household endpoint answers
two kinds of row: a case the reader may open (number, title, type, status) and
an other-domain existence (domain and contact only, by design). A table column
took one template, so a column could not say "the case number and title, else
the domain" or "Yes, else only that it exists".

## What changes

A `table` column's `value` may be a list of templates; the cell shows the first
that fills, as the `rows` title already does.

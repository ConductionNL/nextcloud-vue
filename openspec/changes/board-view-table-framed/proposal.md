# Proposal: board-view-table-framed

## Why

COMPDIFF pl8 read PqService "Opbouw in stappen" with 12px outer insets and 11px rows where the board draws 18px and
12px, and PL5-B pl8 read the same on PqResource "Werktijden" and "Vakanties". Every app table on the legacy `viewTable`
class sits in a `viewTableContainer`, a 1px frame with an 8px radius, and the Pq boards draw those tables as the framed
card table that CnDataTable `framed` already draws: 18px outer insets, 12px rows, a hairline under each row but the
last. board-view-table-head gave `viewTable` the unframed card table (12px insets, 11px rows, hairline above).

Only pipelinq uses `viewTable` (ServiceDetail, ResourceDetail, the booking cards, LeadProducts, LeadContactRoles,
ContactRelationships); no dossiq page does. The Nextcloud look is unchanged.

## What changes

- In the board look a `viewTable` inside a `viewTableContainer` takes 18px on its first and last cells, 12px rows, and
  a hairline under each row but the last.

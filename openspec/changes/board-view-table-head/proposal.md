# Proposal: board-view-table-head

## Why

COMPDIFF pl6 measured PqService "Opbouw in stappen" with its table head at 15px weight 500 on #edeff2 under a rule,
58.5px high, where the boards draw the card table head 14px at 600 (16.8px line). The table is an app's own markup on
the legacy `viewTable` class, which nc-vue keeps as an alias; in the board look nothing restyled it, so the theme's bare
`th` rule and the body's 15px/1.5 drew it. The Dq boards draw every card table the same way (DqZaaktype, DqTermijnen,
DqZaakGerelateerd: 14px/600 in the muted ink on #fafbfc, 10px 12px, no head rule); no dossiq page uses `viewTable`.

## What changes

In the board look a `viewTable` head and its cells take the board card table look that CnRecordListWidget's
`tableLook: "data"` already draws. The Nextcloud look is unchanged.

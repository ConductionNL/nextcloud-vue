# Proposal: board-dialog-controls

## Why

The dialog boards (DqOverdragen, DqBesluit, DqDocumentGenereren, DqArchiveren, DqVolgendeStap, DqNieuweZaak) draw the
footer buttons 16px in (18px with an icon) at 14px, a round 36px close button, a 14px muted subtitle, fields with a 1px
border at 40px, and a two-column create form 720px wide. Live the footer buttons were NcButton's 4px/12px at 15px, the
close button 34px with radius 8, the subtitle 15px in the body ink (the nldesign paragraph rule), fields a shadow, a
date field 34px, and the single selects showed their clear and open buttons outside the field's border. The eyebrow
read `--color-primary-element-text`, the text colour on a primary fill, which is white in plain Nextcloud.

## What changes

In the board dialog: the footer, close button, subtitle tokens, eyebrow colour, field border and plain input height
follow the boards. A single select in the board look takes its full width. CnActionDialog draws facts and checklist
rows with the board's hairlines, and takes `reason.rows`; CnAssignDialog takes `note.rows` (default 3). CnFormDialog
with two columns defaults to the 720px width. Plain Nextcloud dialogs are unchanged apart from CnActionDialog's
facts and checklist spacing.

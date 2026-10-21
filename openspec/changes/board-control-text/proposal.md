# Proposal: board-control-text

## Why

The boards draw a button's text at 14px. Outside the page header, the dialog footer and a few cards that set their
own size, a board-look NcButton draws at Nextcloud's 15px: COMPDIFF r19b counts 61 buttons on 26 dossiq boards at 15px
against the board's 14px (settings actions such as "Opslaan" and "Documentatie", card actions such as "Nieuwe taak",
"Bestanden toevoegen" and "Exporteren").

## What changes

In the board look each NcButton sets `--default-font-size: 14px`, the variable NcButton reads its text size from.
Breadcrumb buttons and a page in the Nextcloud look inside a board app are left alone. A surface that sets its own
`font-size` keeps it, so the next step card's 15px "Verder met beoordelen" is unchanged.

## Scope

Board-only: the default look keeps Nextcloud's 15px.

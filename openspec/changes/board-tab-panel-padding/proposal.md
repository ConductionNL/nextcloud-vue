# Proposal: board-tab-panel-padding

## Why

In the board look a CnTabsWidget panel is the card under the open tab, but it kept the Nextcloud look's 12px padding.
COMPDIFF r19 on DqZaakHistorie measures the "Historie van de zaak" card 12px in where the board draws 20px 22px: its
title sits 13px in against 23px, and so does every row under it. DqZaakDocumenten and DqZaakDocumentenSlepen show the
same 12px panel.

## What changes

In the board look a CnTabsWidget panel takes `--cn-board-card-padding` (20px 22px), and a list's footer Add bleeds
that padding instead of 12px. A panel that holds a stack keeps no padding.

## Scope

Board-only. The Nextcloud look keeps its 12px panel.

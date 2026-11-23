# Proposal: board-contacts-row-menu

## Why

DqZaakBetrokkenen r36: each party row ends in an X on live, where the board draws a "…" menu. CnContactsTab already puts Unlink inside an NcActions in the board look, but NcActions draws a lone action inline as its own icon button, so the menu never appeared.

## What changes

In the board look the row's NcActions forces its menu, so the row ends in "…" with Unlink inside. The Nextcloud look keeps its inline unlink button.

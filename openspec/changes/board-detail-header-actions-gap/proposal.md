# Proposal: board-detail-header-actions-gap

## Why

The case boards draw the header buttons (Bericht, Document, Contact vastleggen, Bewerken, buildiq, Meer) 10px apart.
look-board.css spaces every board header button row by 10px. A later rule in look-board-detail.css set the detail
header's row back to 8px, and live measures 8px on every dossiq case page.

## What changes

The detail header rule no longer sets a gap, so the shared 10px header rule applies. The Nextcloud look is unchanged.

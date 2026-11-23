# The tab strip's Actions button keeps its 34px

## Why

On the detail pages (DqZaak, DqContact, DqOrganisatie, DqTaak, DqTenant and
the other case tabs), the boards draw the "Acties" button at the end of the tab
strip with a 34px minimum height. Batch 24t1 made a labelled menu button 40px
everywhere, and that rule outranked the strip's own 34px. COMPDIFF r24
recorded 22 items as `h 34>40`.

## What changes

The 40px rule now leaves the end of a tab strip alone, so look-board-detail.css
keeps that button at 34px. Page and card headers keep their 40px.

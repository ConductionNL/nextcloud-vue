# Proposal: board-index-header-trail-15

## Why

The list-page boards draw the breadcrumb and note under the title at 15px ("Mijn werk / Aan mij toegewezen · 7 zaken op
uw naam ..."): DqAanMijToegewezen, DqUwWachtrij, DqZaaktypen, DqCatalogus, DqAfdelingen, DqPostvak and others. Live
draws it 14px, the case page's header row size (r25 DqAanMijToegewezen: subtitle 15 vs 14).

## What changes

In the board look a list page's header trail (CnHeaderTrail inside CnIndexPage's header) reads 15px, its crumbs too.
The case page's row and the Nextcloud look are unchanged. No schema change.

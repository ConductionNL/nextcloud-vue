# A sidebar tab in a page card adds no padding

## Why

CnFilesTab, CnNotesTab and the other sidebar tabs pad themselves 12px, which
suits the sidebar. Rendered as a widget in a detail-page card they sit 12px in
from the card's title; the boards draw the toolbar, table and rows flush with
it (DqZaakDocumenten r26c: table at 327 vs 315, width 729.7 vs 753.7).

## What changes

- Board look: `.cn-sidebar-tab` inside a `.cn-detail-widget-host` has no
  padding. The sidebar and the Nextcloud look are unchanged.

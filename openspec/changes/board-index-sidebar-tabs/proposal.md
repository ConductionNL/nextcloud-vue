# Proposal: board-index-sidebar-tabs

## Why

The index side panel (CnIndexSidebar, an NcAppSidebar) drew Nextcloud's sidebar chrome in the board look: the schema
icon before a 20px weight 600 title, and the tabs as 54px tiles with the icon over a 15px label and a highlight bar. The
IndexZijpaneel board, drawn in DqFilterBeheren and DqZakenSorteren, titles the panel 20px bold without an icon and
draws its tabs as one row of 40px labels at 14px weight 600 in the soft ink, the open one underlined 2px in the primary
colour (COMPDIFF r19b: tabs active.fontSize 14 > 15 with 18 more properties, card "Alle zaken" header.fontWeight 700 >
600 with 6 more, on both boards).

## What changes

CnIndexSidebar names its NcAppSidebar root `cn-index-sidebar-panel`. In the board look that panel hides the schema icon,
sets its title 20px bold, and draws the tab row as the board does. Outside the board look nothing changes.

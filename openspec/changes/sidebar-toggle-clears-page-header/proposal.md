# Proposal: sidebar-toggle-clears-page-header

## Why

Fleet probes at 1440px on buildiq and larpinq's character page: with the object sidebar closed, NcAppSidebar's open
toggle ("Open sidebar") sits absolutely at the content's top-right corner, over the page header's last button
("Acties"), and takes its clicks. Under thematiq the toggle also grows to 64x49 (the theme's button padding on an
icon-only button), so it covers even more of the header.

## What changes

- The page headers (CnPageHeader, CnDetailPage, CnDashboardPage) in the Nextcloud look end with
  `--app-sidebar-offset` of room: NcAppSidebar sets that offset to the toggle's footprint while the toggle shows, and to
  0 otherwise.
- The closed sidebar's toggle keeps Nextcloud's square clickable area, whatever padding a theme gives buttons.

The board look already hides the toggle on detail and index pages and is unchanged.

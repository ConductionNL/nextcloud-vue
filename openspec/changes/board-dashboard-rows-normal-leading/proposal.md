# Proposal: board-dashboard-rows-normal-leading

## Why

COMPDIFF r31, DqDashboard and DqMijnTeam: a two-line record-list row on a board dashboard was 69px live against 60px
drawn. The title (15px) and meta line (13px) used Nextcloud's 1.5 body line height; the boards set them at the font's
normal line height.

## What changes

In the board look only, a dashboard record-list row sets its title and meta line at `line-height: normal`. The Nextcloud
look is unchanged.

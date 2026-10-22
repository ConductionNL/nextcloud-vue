# Proposal: board-dashboard-description-gap

## Why

COMPDIFF r24 (nextcloud-vue 2.127): the description under a board dashboard's title sat 19px under the title's text
against 13px drawn, on DqMijnWerk, DqDashboard, DqMijnTeam and DqInspectie. board-dashboard-header-row-gap spaced the
header's rows 6px apart; the description kept its own 6px top margin, so the two added up. The breadcrumb row that change
was for (DqCatalogus, DqDagAfsluiten) has no margin and stays at 13px.

## What changes

In the board look, the description in the dashboard header takes no top margin; the header's 6px row gap spaces it. The
Nextcloud look is unchanged.

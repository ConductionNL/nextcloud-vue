# Proposal: board-list-toolbar-kpi-chips

## Why

r32 (27 Oct): DqZakenSorteren's view switch stood 20px under its chips (the board 8): the 20px row gap meant for the search row also applied where row 1 wraps beside the side panel, pushing the band and the cards 12 to 24px down. DqTeamwachtrij's stat cards were 114px (board 110), the KPI card's own transparent 2px border inside the wrapper's 1px edge; its team-today initials read in the main ink (board the soft ink). A card footer's handler initials were 10.5px (board 12, as the table).

## What changes

In the board look the actions bar keeps 8px between items and wrapped lines, and the search row stands 20px under row 1 by its own margin; a stat card in the index widget row has no KPI border of its own; the team-today initials take the soft ink; a card footer's initials are 12px. Probed live by injection: DqZakenSorteren view switch 279.6, search 339.6, band 399.6; DqZaken search 248, band 308; DqTeamwachtrij stat cards 110 with the label 19 under the top (= boards). No schema change.

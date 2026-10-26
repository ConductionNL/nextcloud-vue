# Proposal: board-list-lead-cell

## Why

COMPDIFF r25 measured the team queue's list (DqTeamwachtrij) with the leading cell ("6 dagen") at 15px, weight 600 on a
22.5px line; the board sets it 14px, weight 700 at the font's normal line height.

## What changes

In the board look a list row's leading cell (`listConfig.leading`) is 14px at weight 700 on the normal line height,
its age widget included (which other board cells keep at 600). The Nextcloud look is unchanged. No schema change.

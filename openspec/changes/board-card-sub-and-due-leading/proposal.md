# Proposal: board-card-sub-and-due-leading

## Why

r31: DqWerkbord's kanban cards stood 9px taller than the board (181.5 vs 172.5) and their pills 4.5px lower. The number line and the footer took Nextcloud's 1.5 leading (19.5px for 13px), the board draws them at normal (15px).

## What changes

In the board look a kanban card's number line and footer read at their normal leading. Probed live by injection: card 172.5, number line 15, pills at 104.5, footer 24, as the board. No schema change.

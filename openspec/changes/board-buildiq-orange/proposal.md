# Proposal: board-buildiq-orange

## Why

Every board draws the buildiq square in #e2611a (962 squares on the boards in design-system main, Dq and Pt alike). Live it was the brand orange #f36c21 (COMPDIFF pq1, the buildiq button on the Pt index boards). The board's orange also reads better: the white icon on it is 3.52:1 where the brand orange is 3.01:1, and its edge on the page ground #f5f6f8 is 3.26:1 where the brand orange is 2.78:1.

## What changes

In the board look the buildiq square sets `--cn-buildiq-color: #e2611a`. The Nextcloud look keeps the brand orange.

## Rollback

Revert the commit.

## Superseded (26 Oct 2026)

Ruben decided on 22 Oct that the boards follow the app: design-system 4db25d04 moved the 65 Dq boards to #f36c21. The board-look override to #e2611a is removed; the square is #f36c21 in both looks (r31: buildiq background flagged on every Dq board).

# The contacts tab's rows in the board look

## Why
DqZaakBetrokkenen "Partijen" (r26a, 24 Oct, with the example parties on the case) drew each person with a role badge that
showed the role's id ("3c0f5a00-..."), uppercase group headings with counts, icon lines per detail, ISO periods
("2026-10-13 – 2027-01-02") and a bare X. The board draws:
- the role as a 15px bold sentence-case heading;
- the person on a row under a hairline, with a 32px initials tile, the name 15/600 and the details on one 13px muted line;
- the period in short dates at the right ("Vanaf 3 okt");
- a "…" menu.

## What changes
In the board look:
- CnContactsTab drops the role badge (the group heading names the role) and the group count;
- the details go on one line separated by middots, and the period moves to the right in board dates;
- unlinking moves into a "…" menu, so the action stays;
- look-board-detail.css styles the heading, the rows and the muted lines.

The Nextcloud look is unchanged. nl: "Vanaf {date}", "Tot {date}", "Meer acties voor {name}", "Contact ontkoppelen". No
schema change.

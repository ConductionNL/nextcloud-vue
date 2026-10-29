# Proposal: board-side-lead-and-status-gaps

## Why

On the case boards (DqZaak and its tab boards) the "Aanvrager" side card draws 12px between the title, the lead and
the "Contactgegevens bekijken" link; live kept the facts widget's 10px under the lead, so the card was 2px short. The
"Status" card starts its explanation 10px under the title; that explanation is set on the normal line, but the side
content still took the first line's half-leading off the 10px, so it started 7.75px under the title (COMPDIFF r35:
Aanvrager h 139 vs 141, Status gapBelowTitle 7.7 vs 10, the cards below 4.4px high).

## What changes

- A side facts card that opens on a lead keeps 12px between the lead and what follows it.
- A side card that opens on a sections widget (the status explanation) starts 10px under its title.

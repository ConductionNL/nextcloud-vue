# Proposal: card-empty-footer-cell-dash

## Why

r31 (26 Oct): DqZakenSorteren draws a case without a handler as "—" before its deadline in the card footer; live left the place out, so the deadline alone stood in the footer (content.firstRowInsetLeft 23 vs 184 on the three unassigned cards).

## What changes

A record card whose layout names a `footerCell` draws an em dash in its place when the field is empty, as an empty table cell reads, beside the footer's pill or date. A footer with nothing else still stays out. No schema change.

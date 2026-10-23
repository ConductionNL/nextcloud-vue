# Proposal: board-audit-rows

## Why

COMPDIFF r23, DqHandhaving and DqTenant "Historie": the audit card's first line started 17.8px under the card title
against 21px drawn, with 55px rows against 56px. The boards draw these rows as their list rows: 10px above and below, a
hairline over every row including the first, the action and the line under it at their normal line height. Live used 6px
padding, a rule under each row, and the body's 1.5 line height.

## What changes

In the board look only, an audit card row pads 10px above and below with a hairline over it and none under it; its head
and its second line sit at their normal line height, 2px apart. The Nextcloud look is unchanged.

# Proposal: board-follow-row

## Why

The boards draw a detail page's Follow control on a row of its own under the breadcrumb (DqZaak: "Anouk Bakker kijkt
nu ook naar deze zaak · Volgen"), clear of the title row. Live it sat on the title row, so the Follow button and its
follower count read as two extra header actions (COMPDIFF r19: pageHeader buttons 6 -> 7, 34 boards).

## What changes

In the board look CnDetailPage draws the Follow control (toggle, notifications switch and follower count, all kept) on
a third header row under the breadcrumb row. Without the look it stays beside the title.

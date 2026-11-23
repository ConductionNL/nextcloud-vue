# Proposal: sidebar-sort-direction-segmented

## Why

Board DqZakenSorteren draws the index sidebar's sort direction as a "Richting" heading over two segments, "Oplopend"
and "Aflopend", each with an arrow. The sidebar drew two radio buttons.

## What changes

On the board look CnIndexSidebar draws the direction with CnSegmentedControl (stretched, an arrow before each label)
named by a "Direction" heading. The Nextcloud look keeps the radios. Both stay disabled for an order of its own.

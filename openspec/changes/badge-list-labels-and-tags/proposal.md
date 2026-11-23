# Proposal: badge-list-labels-and-tags

## Why

pl8 on board PqServices (item 5): the "Booked on" column shows the stored code "staff" where the board draws the
tag "Medewerkers", 18px tall at 12px. A `badge` cell labels a single enum value from `x-enum-labels`, but a list
drew each entry as stored, and in the 21px status tag size.

## What changes

- A `badge` cell whose value is a list labels each entry from the items' `x-enum-labels` (or the normalised
  `enumLabels`), through the host translate; an entry without a label shows as stored.
- In the board look the chips of such a list are the boards' small tags: 2px 8px, radius 10, 12px at 600, 4px apart.

## Not in this change

- A single badge keeps the 21px status tag.

# Proposal: choice-cards-rows-columns

## Why

DqZaakSamenwerken draws its two acts, Share and Hand over, as two option rows side by side right under the dialog's
title, with no group label above them. CnChoiceCards' `rows` layout always stacked its rows and ignored `columns`, so
dossiq used the card grid instead: two 198px cards with a divider and a shadow, under a visible "What you do" legend.
COMPDIFF r24 measured 16 items on the dialog and its two cards.

## What changes

- In `layout="rows"`, `columns` above 1 sets the rows side by side in that many equal columns. 0 and 1 keep the
  single column.
- A new `hideLabel` prop keeps the legend for assistive tech only.

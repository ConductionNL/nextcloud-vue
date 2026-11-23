# Proposal: dashboard-column-weights

## Why

PqWerkplekKlant (PL5-C pl8): in a call the board draws three columns 332 / 415 / 332 wide (who is it, this contact moment, the knowledge base and tasks); the dashboard grid can only give them twelve equal shares, 360 each. Every card in the three columns is off in x and width. `gridSideColumn` fixes one side column on the right; it cannot weigh a middle column against two equal outer ones.

## What changes

A dashboard can weigh groups of its twelve columns: `gridColumnWeights: [{ span, weight }]`, spans adding up to 12. Each group takes its weight's share of the width, split evenly over its columns; an item's left edge and width follow the columns it spans. A `layoutWhen` entry can carry its own `gridColumnWeights` for the layout it draws, so PqWerkplekKlant weighs the in-call layout only. It applies on the full twelve-column grid and not while editing; GridStack keeps its twelve columns underneath, and a phone keeps its single column. Items on a `gridSideColumn` track keep that column. Opt-in: a page without it keeps twelve equal shares, so no dossiq board moves.

Probed on :8080 with compdiff `--inject-css` (the same placement as fixed CSS): PqWerkplekKlant Wie is het 292/332, Dit contactmoment and Openstaande zaken 644/415, Kennisbank, Taken and Eerder contact 1080/332, all = board (were 292/360, 672/360, 1052/360).

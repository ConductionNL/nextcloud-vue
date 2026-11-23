# Proposal: board-period-group-soft-ink

## Why

The boards draw their compact segmented group (the period switch on DqDoorlooptijd and DqTermijnen, Gemiddeld /
Mediaan on DqProcesanalyse) with the options not chosen in the soft ink (#3d4047 under the Zuiddrecht set) and 14px
of padding beside each label. The library drew every option in the main ink at 12px (COMPDIFF r20: color
rgb(61, 64, 71) > rgb(27, 28, 29) on "Mediaan", "Deze week", "Dit jaar", "Kwartaal" and "Jaar"; paddingLeft 14 > 12).

## What changes

In the board look a compact segmented control pads a label 14px on each side and draws the options not chosen in
`--cn-board-text-soft`; the chosen option keeps the main ink. An icon-only option stays square. The default look is
unchanged.

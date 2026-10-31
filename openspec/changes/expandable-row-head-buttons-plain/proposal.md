# Proposal: expandable-row-head-buttons-plain

## Why

pl6 on board PqPipelines (6-16): the sort and filter buttons in an expandable row's sub-table head (Volgorde, Fase,
Kans, Startfase, Gesloten, Resultaat) draw as 22.5px grey buttons with an 8px radius and 7px between them. The board
draws plain head labels 4px apart. Nextcloud's server rule `button:not(.button-vue,[class^=vs__]):not(.app-navigation-entry-button)`
(specificity 0,2,1) beats the scoped single-class rules (0,2,0), so their `background: transparent`, `margin: 0` and
`min-height: 0` lost.

## What changes

The sort and filter rules carry their wrapper class (`.cn-expandable-row__th`, `.cn-expandable-row__filter-anchor`),
so they outrank the server rule. The sort button also clears the server's border radius. The active and hover filter
tint stays.

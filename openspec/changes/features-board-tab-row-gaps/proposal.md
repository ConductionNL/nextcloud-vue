# Proposal: features-board-tab-row-gaps

## Why

Board PqRoadmap draws the tabs 4px apart, the status chips 8px apart and the Actions menu beside the tabs at 34px
with 12px padding. Live drew 7px, 11px and 40px with 14px (pl4 PqRoadmap 27, 29-31): Nextcloud's core sheet gives
every plain button a 3px margin that the single-class rules did not outrank, and the board look's rule for a labelled
menu button (40px, for header menus) also reached the menu beside the tabs.

## What changes

The tab and chip rules clear the margin with a two-class selector, as the segmented filter already did. The labelled
menu rule leaves out the menu beside the features board's tabs, which the board look draws at 34px with 12px padding,
as the Actions button at the end of a detail page's tab strip.

## Scope

CnFeaturesBoard scoped style and look-board.css. No props, no schema.

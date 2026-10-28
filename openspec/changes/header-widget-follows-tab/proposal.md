# Proposal: header-widget-follows-tab

## Why

DqZaakAssistent draws the AI-toezicht tab without the case's stages bars. The what-now card, the stage action and the
generic side cards already stand aside for that tab through `notTabs`, but the header widget (`headerWidget`, the
stages bars) showed beside every tab, so the whole page stood 87px lower than drawn.

## What changes

The widget the header holds follows `tabs` / `notTabs` on its definition, as a side card does. Standing aside only
hides it in the header; it does not move back into the body grid. Edit mode shows it.

## Scope

Additive. A header widget without either key shows beside every tab, as before.

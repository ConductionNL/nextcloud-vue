# Proposal: widget-lead-widgets-in-card

## Why

DqZaakDocumenten draws the review summary ("4 van 7 beoordeeld", the verdict bar and its legend) inside the Files
card, between the card's title row and the file rows. Live drew it as a block of its own above the card: the summary is
a separate `stacked-bar` widget, and a tab stacks its widgets one under the other.

## What changes

A widget's `content.leadWidgetIds` names other widgets on the surface that the host draws inside this widget's card,
after its title row and before its own content, each without a card of its own and only while its own `visibleWhen`
holds. A listed id that names nothing draws nothing. The tab or grid that listed the lead widget on its own should drop
it, or it draws twice.

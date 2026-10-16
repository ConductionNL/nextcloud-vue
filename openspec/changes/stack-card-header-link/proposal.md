# Proposal: stack-card-header-link

## Why

A tab can hold a stack of cards (`widgetIds`). Since #1658 the strip draws the first widget's `headerLink` beside the
tabs, but the cards below it drew no link at all: a manifest link on any of them was dropped.

## What changes

CnDetailWidgetHost takes `showHeaderLink`: a card then draws its widget's manifest header link when the renderer reports
none. CnTabsWidget sets it on the cards after the first in a stack. Off by default, so no other surface changes.

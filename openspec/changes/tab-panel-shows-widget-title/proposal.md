# Proposal: tab-panel-shows-widget-title

## Why

Board PqMailinglijst draws the Overview tab's single data widget under its own title, "Lijstgegevens", with no line
under it. CnTabsWidget heads a single widget's panel only when the widget has a title and a description, so the
title was dropped on live (pl4 PqMailinglijst 5). Dropping a title that only repeats the tab stays right for most
tabs, so the title row has to be asked for.

## What changes

A tab entry takes `showTitle: true`. A tab with one widget then heads its panel with the widget's title even when the
widget has no description. A title equal to the tab's label is still not repeated, and a description still draws as
the line under the title. Nothing changes for a tab without the key.

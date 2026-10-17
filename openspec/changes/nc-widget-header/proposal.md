# Proposal: nc-widget-header

## Why

A Nextcloud dashboard widget (`nc-widget`) always drew its own header, icon and title, falling back to the raw widget
id ("activity"), also inside a dashboard card that already drew a title. Board DqMijnWerk shows "Recente activiteit"
once.

## What changes

- CnWidgetWrapper provides `cnWidgetTitled`: whether the card draws a title row.
- CnNcWidgetWidget leaves its own header out inside such a card, or with `content.showHeader: false`.

On its own, or in a card without a title, the widget keeps its header as before.

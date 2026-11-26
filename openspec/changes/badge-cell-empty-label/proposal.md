# Proposal: badge-cell-empty-label

## Why

Board DqPostvak draws a message without a proposal as a grey "Geen zaak" pill in the Voorstel column; the badge cell drew a dash.

## What changes

- The `badge` cell widget takes `widgetProps.emptyLabel`: an empty value renders as a default (grey) pill with that label, through the host translate. Without it the dash stays.

# Proposal: leaf-card-widget-title

## Why

DqZaakBetrokkenen showed a card titled "Contacts" where the manifest titles the widget "Parties" ("Partijen"). The detail
host hands an integration leaf the translated widget title as `title`, but the contacts, notes, tasks and contact
moment cards name their title `titleLabel`, so they printed their own English default. A mount-mode leaf got no title
at all.

## What changes

CnDetailWidgetHost also hands the translated widget title as `titleLabel` when the widget has one, and gives a
mount-mode leaf the same `title` and `titleLabel`. A widget without a title leaves the leaf its own.

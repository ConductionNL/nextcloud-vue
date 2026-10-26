# Proposal: object-list-read-only-rows

## Why

Board DqZaaktypeVelden lists a case type's fields with a Herkomst column: its own fields ("Eigen veld") and the ones
it inherits from its parent type ("Geërfd van Omgevingsvergunning"). The Velden table is an object list over the
type's own propertyDefinitions (editable inline); the inherited ones come from the case type blueprint endpoint, which
tags each row with its origin. The object list could not show rows it does not own (coordinator decision, 23 Oct).

## What changes

`CnObjectListWidget` takes `content.readOnlyRows: { url, responsePath?, where? }`: an app endpoint (tokens resolved
against the page record), narrowed by `where`, added after the list's own rows and tagged `_readOnly`. A read-only row
has no row actions and a click on it opens nothing; the own rows keep editing. A list with only read-only rows shows
them instead of its empty state.

## Reach

Opt in. No schema change (object-list content is open); docs in `cn-object-list-widget.md`.

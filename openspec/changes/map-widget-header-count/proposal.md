# Proposal: map-widget-header-count

## Why

The case boards draw the "Locaties" card with "1 locatie" under its title (DqZaak and every case tab that shows the
Overview). The detail card host draws a renderer's `header` subtitle, but the map widget reported none.

## What changes

CnMapWidget takes `content.headerSubtitle`: `{ one, other }` or one string with `{total}`, through the host translate. Once
the marker source has answered with markers it reports the filled line as its `header` event's `subtitle`; before that,
on a failure, or without markers it reports an empty line. No schema change.

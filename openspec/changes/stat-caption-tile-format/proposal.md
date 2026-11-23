# Proposal: stat-caption-tile-format

## Summary

A stat tile's caption token can take the tile's own number format: `{path|tile}` writes the value at `path` the way the tile writes its number (`content.format`).

## Why

Measurement pl3 (28 October 2026), pipelinq board PqOperationeel: the comparison tiles say what the period before was under the number ("was 21,5% in de 30 dagen ervoor", "was 22,1 uur", "contactmomenten, was 540"). A caption could read the previous value from the endpoint payload, but only raw ("21.5"): no template format writes a percentage, a duration or a grouped count the way the tile does.

## What changes

- `CnStatWidget`: a caption token with the `tile` format is formatted with `formatMetricValue` over `content.format`, empty when the payload holds no value there.
- `tests/components/CnStatWidgetCaptionTileFormat.spec.js`.

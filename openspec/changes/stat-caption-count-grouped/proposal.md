# Proposal: stat-caption-count-grouped

## Summary

A stat tile's caption count (`{count}` over `content.captionSource`) is written in the reader's locale, with thousands grouped.

## Why

Measurement pl3 (28 October 2026), pipelinq board PqNieuwsbrieven: the "Verzonden deze maand" tile captions the month's messages as "3.912 berichten". The caption printed the raw number, "3912".

## What changes

- `CnStatWidget` formats `{count}` with `Intl.NumberFormat(metricLocale())`, as the ratio caption already does.
- `tests/components/CnStatWidgetCaptionCountGrouped.spec.js`.

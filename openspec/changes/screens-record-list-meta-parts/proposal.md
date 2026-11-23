---
kind: code
---

# Proposal: screens-record-list-meta-parts

## Summary

A record-list row's `meta` is one template, and one empty token empties the whole line. Dossiq's Mijn werk
wants "number · case type · handler", where the handler is often empty, so the line vanished for those rows.

## What changes

`content.meta` may be `{ parts: [template, ...], separator? }`: each part is filled on its own, empty parts
are dropped and the rest are joined by `separator` (default " · "), as the facts widget does for a `line`.
A string `meta` works as before.

No schema change (widget content is an open object).

---
kind: code
---

# Proposal: lens-says-why-it-is-empty

## Summary

A personal lens that cannot answer says why. When OpenRegister reports in a
list response that a lens is unavailable (`@self.lenses.<lens>.available:
false` with a `reason`), the index page and the object-table widget show a
short explanation in place of the generic empty text. Today the "Recently
opened" tile on an instance that does not log reads is simply empty, which
reads as "you opened nothing".

## Why

Ruben decided on 9 October 2026: when the instance does not log reads, the
"Recently opened" tile is empty and says why. OpenRegister PR #4514
(`read-history-on-audit-trail`) moves the `_recent` lens onto the audit trail
and, whenever `_recent=true` is asked, adds a response-level report:

```json
{ "@self": { "lenses": { "recent": { "available": false, "reason": "audit-trail-disabled" } } } }
```

`available: false` always comes with an empty page. The reasons are
`audit-trail-disabled`, `anonymous` and `read-history-unavailable`. Building
the message in the library means every app's recent tile and Recent quick
filter gets it with no app change.

## What changes

- The object store keeps `@self.lenses` of the last collection response per
  type (`lenses[type]`, `{}` when the response has none); `useListView`
  exposes it as `lenses`.
- New `src/utils/lensAvailability.js`: `readLensReports(body)` and
  `lensUnavailableText(reports, overrides)`, plus the built-in copy for the
  `recent` lens's three reasons. The lens name is a key, so a later
  `_watching` report needs only copy, not a new mechanism.
- `CnIndexPage` shows the explanation as its empty-state title when the
  latest response reports an unavailable lens. New props `lenses` (the
  report, for a host that fetches itself) and `lensReasonTexts` (app copy per
  `<lens>.<reason>` or `<reason>`).
- `CnDataTable` keeps the report of its own self-fetch and shows the
  explanation in its empty row; `CnWidgetObjectTable` (manifest
  `object-table` widgets, including a `source.filter._recent` tile) forwards
  `lensReasonTexts`.

## Compatibility

Additive, minor. A response without `@self.lenses`, a report with
`available: true`, or an unknown reason keeps today's empty text. The
`#empty` slots still win. Needs openregister#4514 to have any visible effect.

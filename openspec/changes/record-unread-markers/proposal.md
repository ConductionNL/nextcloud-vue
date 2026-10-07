---
kind: code
---

# Proposal: record-unread-markers

## Summary

A record a colleague changed since you last looked shows in bold with a dot
in every list, an Unread quick filter finds them, the record's tabs carry a
badge for what is new on them, and opening the record marks it read.
OpenRegister tracks this per user already; nothing on screen reads it.

## Why

openregister row `rec-unread`, "See which records are new or changed since
you last looked", rated partial. OpenRegister's change
`record-star-follow-and-unread-on-screen` (openregister PR #4452) names
`CnUnreadMarker`, the `CnDetailPage` tab badges from `@self.unreadCounts` and
the `_unread` quick filter as nextcloud-vue's half (its design D-1).

The backend is OpenRegister's archived `object-read-state` (2026-10-05):

- `@self.unread` on reads and lists.
- `@self.unreadCounts` on the detail read only: a map of sub-resource name to
  unread count; a sub-resource the schema does not declare is absent, not 0.
- `GET`/`PUT`/`DELETE /api/objects/{register}/{schema}/{id}/read-state`.
- The lens `_unread=true`.

Opening a record marks nothing read today: only `PUT .../read-state` does,
and nothing sends it.

## What changes

- New `CnUnreadMarker`: a dot with a screen-reader label, for a row whose
  `@self.unread` is true. `CnIndexPage` renders it in the first cell and
  draws the row's title in bold.
- `personalLenses` (from `record-favourite-and-follow`) accepts `unread`,
  adding the quick filter Unread `{_unread: true}`.
- `CnDetailPage` maps `@self.unreadCounts` onto its tabs' `count`, by the
  tab's `unreadKey` (default: the tab id).
- `CnDetailPage` sends `PUT .../read-state` once after the object has
  rendered, when the page config sets `markRead: true` or omits it and the
  object carries `@self.unread`. It offers "Mark as unread" in the Actions
  menu, sending `DELETE .../read-state`.

## Rows unblocked

- openregister `rec-unread` (the nextcloud-vue half).

## Affected projects

- `nextcloud-vue`: `CnUnreadMarker`, `CnIndexPage`, `CnDetailPage`, the v2
  manifest schema, the interactions store plugin.
- Consumers: OpenRegister's Tables and record pages, every leaf index and
  detail page on OpenRegister objects.

## Backward compatibility

Additive. Without `@self.unread` nothing renders and no call is sent.
`markRead: false` keeps a page from marking anything read. A tab with its
own `count` keeps it; the unread count applies only where the tab has none.

## Dependencies

`personalLenses` is introduced by `record-favourite-and-follow`. If this
change is built first, it introduces the prop with `unread` as its only
value.

## Theming

Dot in `--color-primary-element`; bold via `font-weight: bold`. Nextcloud
CSS variables only.

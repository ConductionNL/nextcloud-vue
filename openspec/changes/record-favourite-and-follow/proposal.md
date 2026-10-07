---
kind: code
---

# Proposal: record-favourite-and-follow

## Summary

A record shows a star and a Follow toggle beside its title, on every
`type: detail` page and on OpenRegister's own record page. A user who may
update the record sees how many colleagues follow it and who they are; a user
who may manage it can add or remove a colleague. Index pages get a star
column and three personal lenses: Favourites, Recent and Following.
OpenRegister already stores all of this per user; this change is the screen.

## Why

Three rows wait on it.

- pipelinq `work-collaborators`, "Add colleagues to a case so they can work on
  it with you and follow its updates". pipelinq's change
  `notify-the-followers-of-tickets-and-leads` adds `{"watchers": true}` to the
  ticket and lead notification rules and says: "No user can follow anything:
  the ticket and lead detail pages are manifest `type: detail` pages rendered
  by nextcloud-vue, and nextcloud-vue has no Follow control and no caller of
  `/watch`."
- openregister `rec-favourites` and `rec-follow`. OpenRegister's change
  `record-star-follow-and-unread-on-screen` (openregister PR #4452) names
  `CnFavouriteToggle`, `CnFollowToggle`, the `CnIndexPage` star column and the
  quick filters `_favourite`, `_recent`, `_watching` as nextcloud-vue's half
  (its design D-1), and says OpenRegister builds no local copy.

The backend is archived in OpenRegister: `favourites-and-recent`,
`object-watchers` (PR #3707) and `object-read-state`, all 2026-10-05. Read on
openregister development on 7 October 2026:

| Call or marker | Who | Answer |
|---|---|---|
| `PUT`/`DELETE /api/objects/{register}/{schema}/{id}/favourite` | anyone who may read | `@self.favourite` |
| `PUT`/`DELETE .../watch` | anyone who may read | watcher row, or 204 |
| `@self.watching` on reads and lists | the reader | boolean |
| `@self.watcherCount` | only a reader with `update` (omitted otherwise) | integer |
| `GET .../watchers` | `update` | `{results: [{userId, created, ...}], total}`, else 403 |
| `PUT`/`DELETE .../watchers/{userId}` | `manage` (remove: also the user themselves) | row, 204, 400 "Unknown user", 403 |
| lenses `_favourite`, `_recent`, `_watching` | the reader | filtered list; `_recent` orders by last view |

## What changes

- New `CnFavouriteToggle` (star) bound to `@self.favourite`.
- New `CnFollowToggle` bound to `@self.watching`, with the count from
  `@self.watcherCount` when present, a followers popover, and an "Add a
  colleague" picker for a user with `manage`.
- `CnDetailPage` renders both beside the title when the object carries the
  markers, controlled by manifest `config.favourite` and `config.follow`.
- `CnIndexPage` gains `showFavouriteColumn` and `personalLenses` (any of
  `favourite`, `recent`, `watching`), appended to the page's quick filters.
- Both toggles flip at once and revert with the server's message on failure.

## Rows unblocked

- pipelinq `work-collaborators` (the Follow half).
- openregister `rec-favourites`, `rec-follow` (the nextcloud-vue half).
- dossiq `case-followers` uses the same control.

## Affected projects

- `nextcloud-vue`: two new components, `CnDetailPage`, `CnIndexPage`, the v2
  manifest schema, one store plugin.
- `openregister`: places the components on its own record and Tables pages
  (its change). One optional addition, `manage` in `@self.can`, see design D3.
- Consumers: pipelinq, dossiq, decidiq and every app with a detail page.

## Backward compatibility

Additive. Without the markers on the object nothing renders. `follow: false`
and `favourite: false` remove the controls. `showFavouriteColumn` defaults to
`false` and `personalLenses` to `[]`.

## Theming

`NcButton`, `NcAvatar`, `NcPopover`; star filled with `--color-warning`,
everything else Nextcloud CSS variables.

---
kind: code
---

# Proposal: detail-page-follow-control

## Summary

A `type: detail` page gets a Follow control in its header. A user who may
read the record can follow and unfollow it. A user who may update it sees how
many colleagues follow it and who they are. A user who may manage it can add
or remove a colleague. OpenRegister already stores who follows what and
notifies them; this change is the button every app's detail page was missing.

## Why

pipelinq matrix row `work-collaborators`, "Add colleagues to a case so they
can work on it with you and follow its updates", rated partial and specified.
pipelinq's change `notify-the-followers-of-tickets-and-leads` (on pipelinq
development) adds `{"watchers": true}` to the ticket and lead notification
rules and names the missing half: "No user can follow anything: the ticket and
lead detail pages are manifest `type: detail` pages rendered by nextcloud-vue,
and nextcloud-vue has no Follow control and no caller of `/watch`."

The backend is built and archived in OpenRegister as
`2026-10-05-object-watchers` (OpenRegister PR #3707), read on openregister
development on 7 October 2026:

| Call | Who | Answer |
|---|---|---|
| `PUT /api/objects/{register}/{schema}/{id}/watch` | anyone who may read | the watcher row |
| `DELETE /api/objects/{register}/{schema}/{id}/watch` | the watcher | 204 |
| `GET /api/objects/{register}/{schema}/{id}/watchers` | `update` | `{results: [{userId, created, ...}], total}`, else 403 |
| `PUT /api/objects/{register}/{schema}/{id}/watchers/{userId}` | `manage` | the watcher row; 400 "Unknown user"; 403 |
| `DELETE /api/objects/{register}/{schema}/{id}/watchers/{userId}` | `manage`, or the user themselves | 204 |

Object reads carry `@self.watching` for the current user
(`lib/Controller/ObjectWatchersController.php`, `appinfo/routes.php:142-166`).

## What changes

- `CnDetailPage` renders a `CnFollowButton` in the header actions when the
  manifest page config sets `follow: true`, or by default for a page whose
  object came from OpenRegister and carries `@self.watching`.
- The button reads `@self.watching`, toggles with `PUT` or `DELETE .../watch`
  and updates optimistically, rolling back on an error.
- For a user who may update the record, the button shows the follower count
  and a popover listing the followers with their avatars.
- For a user who may manage the record, the popover offers an "Add a
  colleague" user picker and a remove action per follower.
- New manifest key `config.follow` (`true`, `false` or omitted) on detail
  pages in the v2 manifest schema. Omitted means automatic, as above.

## Rows unblocked

- pipelinq `work-collaborators` (the Follow half; pipelinq's notification
  half is `notify-the-followers-of-tickets-and-leads`).
- Every app with a detail page on OpenRegister objects gets the same control:
  dossiq `case-followers` reads the same endpoints.

## Affected projects

- `nextcloud-vue`: `CnDetailPage`, a new `CnFollowButton`, the v2 manifest
  schema, the object store (one helper per call).
- `openregister`: nothing new for follow and the count. See design D3 for the
  one open dependency (`@self.can.manage`).
- Consumers: pipelinq, dossiq, decidiq, and any app rendering `type: detail`.

## Backward compatibility

Additive. A page with `follow: false` renders exactly as today. An object
without `@self.watching` (an older OpenRegister, or a non-OpenRegister source)
renders no button. No prop changes meaning.

## Theming

`NcButton` and `NcAvatar` only; Nextcloud CSS variables, no new colours.

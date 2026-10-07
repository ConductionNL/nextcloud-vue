# Design: detail-page-follow-control

Read on nextcloud-vue development `3eefb4f00`, openregister development and
pipelinq development on 7 October 2026. No canvas board draws the Follow
control yet; it sits in the detail header with the other header actions,
before the Actions menu, the place Nextcloud Files and Deck give "Follow".

## D1. Where the truth lives

`@self.watching` on the object read is the only state the button needs for
the current user. The button never caches it beyond the page: after a toggle
it writes the answer of the call into the object's `@self.watching` in the
store, so a list that shows the same object agrees.

## D2. Who sees what, decided by the server

The count and the list need `update`. The library does not guess the right
from the schema: it asks for `@self.can` with `_extend=@self.can` on the
detail read (OpenRegister `RenderObject.php:2696`, which answers `update`)
and fetches `GET .../watchers` only when `@self.can.update` is `true`. A 403
on that call hides the count without an error toast: the server is the
authority and a hidden count is the correct answer to a refusal.

## D3. The manage right

OpenRegister checks `manage` on `PUT` and `DELETE .../watchers/{userId}` but
`@self.can` reports `update` only today. The picker therefore shows when
`@self.can.manage === true`. Until OpenRegister adds `manage` to `@self.can`
the picker stays hidden, which is the safe side. Asking OpenRegister for that
key is listed in the hand-back as a cross-repo line; it is one extra entry in
the array `RenderObject` already builds. Alternative rejected: show the picker
to every user with `update` and let a 403 explain. That shows an action most
users cannot take.

## D4. Optimistic toggle

Following is the most frequent action and it changes nothing on the object
(OpenRegister writes no audit entry and no version). The button flips at
once, sends the call, and flips back with an error toast on failure. A 404
(the user lost read access since the page loaded) shows "You can no longer
see this record" and leaves the button off.

## D5. Not a favourite

OpenRegister keeps favourites (stars) and watchers apart (its design D-1).
This change does not touch the star. A star control, if the openregister
part-3 lane asks for one, is a separate change.

## D6. Manifest key

`config.follow` on a detail page: `true` forces the control (and logs a
warning when the object has no `@self.watching`), `false` removes it,
omitted means automatic. A boolean keeps the manifest small; a later object
form (`{ count: false }`) can extend it without breaking `true`.

## Files

- `src/components/CnFollowButton/CnFollowButton.vue`, `index.js`, `.md`
- `src/components/CnDetailPage/CnDetailPage.vue` (header slot wiring)
- `src/store/plugins/watchers.js`, registered in `src/store/plugins/index.js`
- `src/schemas/app-manifest-v2.schema.json` (detail page `follow`)
- tests under `tests/components/CnFollowButton.spec.js`

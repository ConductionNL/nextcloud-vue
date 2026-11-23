# Design: record-favourite-and-follow

Read on nextcloud-vue development `3eefb4f00`, openregister development and
its PR branch `spec/missing-parts` (#4452), and pipelinq development on
7 October 2026. Placement follows the zuiddrecht case page the leaf apps
use: star and Follow in the header, beside the title (openregister
`record-star-follow-and-unread-on-screen` design, intro). No board draws the
followers popover; it opens under the Follow toggle.

## D1. The markers are the state

`@self.favourite`, `@self.watching` and `@self.watcherCount` on the read are
everything the toggles need. After a call the store writes the server's
answer into the object's `@self`, so a list showing the same object agrees.

## D2. Optimistic, reverted on failure

A click flips the toggle and sends the call. A failure flips it back and
shows the server's message. A 404 means the record went away or access was
withdrawn: the toggle stays off and the message says the user can no longer
see this record. (OpenRegister's own page reloads on 404; a library component
does not reload a host page, it emits `not-found` and the page decides.)

## D3. Who sees the count, who may change followers

The server decides. `@self.watcherCount` is set only for a reader with
`update` and omitted otherwise (`ObjectEntity.php:670-681`), so its presence
is the signal: count shown, popover available, `GET .../watchers` fetched
when the popover opens, never before. A 403 there closes the popover without
a toast.

Changing another user's subscription needs `manage`. OpenRegister adds
`manage` to `@self.can` (openregister #4455, `record-star-follow-and-unread-on-screen`
design D-6), decided by the same `ObjectScopeResolver` call the watchers
endpoint makes, so the marker and the endpoint agree. `@self.can` is opt-in:
OpenRegister returns it only when the read asks `_extend=@self.can`, and
without it the response carries no `@self.can` at all. So `CnDetailPage`
SHALL add `@self.can` to `_extend` on its detail read whenever it renders
`CnFollowToggle`, merged with any `_extend` the page already asks for. Without
that extend the picker would never show. The picker shows when
`@self.can.manage === true`; a missing key or `false` keeps it hidden, the
safe side. Rejected: showing the picker to everyone with `update` and letting
a 403 explain.

## D4. Follow says what it does

When the host passes `notifies: false` (OpenRegister knows whether a schema
rule targets watchers; a leaf app knows its own rules), the tooltip says
"You will see it under Following. This register sends no change
notifications." Default `true`, since the apps that asked for Follow
(pipelinq, dossiq) declare the rule.

## D5. Lenses are quick filters

`CnIndexPage` already renders `quickFilters` (`{label, filter}`).
`personalLenses` appends built-in entries: Favourites `{_favourite: true}`,
Recent `{_recent: true}`, Following `{_watching: true}`. While Recent is on,
column sort is disabled because the lens owns the order (openregister D-5).
The unread lens is added by `record-unread-markers`.

## D6. Star column

`showFavouriteColumn` adds a narrow first column rendering
`CnFavouriteToggle` per row from `@self.favourite`. Clicking it does not open
the row.

## D7. Manifest keys

`config.favourite` and `config.follow` on detail pages: boolean, omitted
means automatic (render when the marker is present). `config.showFavouriteColumn`
and `config.personalLenses` on index pages map to the props.

## Files

- `src/components/CnFavouriteToggle/`, `src/components/CnFollowToggle/` (vue, index.js, md)
- `src/store/plugins/interactions.js` (favourite, watch, watchers calls), `src/store/plugins/index.js`
- `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnIndexPage/CnIndexPage.vue`
- `src/schemas/app-manifest-v2.schema.json`
- `tests/components/CnFavouriteToggle.spec.js`, `tests/components/CnFollowToggle.spec.js`, `tests/components/CnIndexPagePersonalLenses.spec.js`, `tests/store/interactions.spec.js`

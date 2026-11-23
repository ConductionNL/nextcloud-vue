# Design: record-unread-markers

Read on openregister development (`object-read-state`) and PR branch
`spec/missing-parts` (#4452), nextcloud-vue development `3eefb4f00`, on
7 October 2026. No board draws the unread dot; it follows Nextcloud Mail's
unread rows (bold, dot before the subject).

## D1. When a record counts as read

After the object's data has rendered, not on route entry: a user who
bounces off a failing page has not seen the record (openregister D-3). One
`PUT` per page load; a refresh in place does not send another.

## D2. Mark as unread

An Actions-menu entry, shown when the object carries `@self.unread`. It
sends `DELETE .../read-state`, then emits `marked-unread`; the page stays
open. OpenRegister's page navigates back; a library page leaves that choice
to the host (`markUnreadNavigatesBack`, default `false`).

## D3. Tab badges

`@self.unreadCounts` is keyed by sub-resource (`files`, `notes`, ...). A tab
declares `unreadKey` when its id differs from the sub-resource name. A key
absent from the map means no badge; 0 means no badge too, since "nothing new"
needs no mark. A tab with a manifest `count` keeps its own count; the unread
count is shown only where the tab has none. Opening a tab marks nothing: the
backend tracks one moment per record.

## D4. Accessible marker

The dot is `aria-hidden`; a visually hidden "Unread" precedes the row title,
so a screen-reader user hears it once per row and the bold carries it
visually.

## Files

- `src/components/CnUnreadMarker/` (vue, index.js, md)
- `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnDetailPage/CnDetailPage.vue`
- `src/store/plugins/interactions.js` (`markRead`, `markUnread`)
- `src/schemas/app-manifest-v2.schema.json`
- `tests/components/CnUnreadMarker.spec.js`, `tests/components/CnIndexPageUnread.spec.js`, `tests/components/CnDetailPageReadState.spec.js`

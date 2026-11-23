# CnFollowToggle

The one Follow control of a record: a Follow toggle bound to `@self.watching`, a notifications switch bound to `@self.watchNotify`, the follower count and a followers popover (OpenRegister `object-watchers`). `CnDetailPage` renders it beside the title when the object carries `@self.watching`.

Following and favourites are one feature since OpenRegister's `merge-follow-and-favourites`: a favourite is a follow with notifications off, so there is no star.

- A click flips it at once and sends `PUT` or `DELETE .../watch`; on failure it flips back and shows the server's message. A 404 says the user can no longer see the record and emits `not-found`.
- The count shows only when `watcherCount` is given. OpenRegister sets `@self.watcherCount` for a reader with `update` only, so its absence hides the count and the popover. Following or unfollowing moves the count by one.
- Opening the popover fetches `GET .../watchers` (never before) and lists each follower with avatar, name and start date. A 403 or error closes it without a toast.
- With `canManage` (`@self.can.manage`) the popover offers an "Add a colleague" user picker (`PUT .../watchers/{userId}`) and a remove action on each follower. A 400 or 403 keeps the popover open and shows the server's message beside the picker. Without `canManage`, only the user's own row can be removed.
- While the user follows, a bell beside the toggle turns the follow's notifications on or off with `PUT .../watch` and `{"notify": false}` or `{"notify": true}`. It is optimistic and reverts with the server's message on failure. A new follow notifies.
- `compact` draws the toggle as an eye icon only, without the bell, count or popover, for a column in a list (`CnIndexPage` `showFollowColumn`).
- `notifies: false` hides the bell and changes the tooltip to say following adds the record to the Following list and sends no change notifications.

`@self.can` is returned by OpenRegister only on request, so `CnDetailPage` adds `@self.can` to `_extend` on its object read while the toggle can render.

## Usage

```vue
<CnFollowToggle
  register="pipelinq"
  schema="ticket"
  :object-id="ticket.id"
  :watching="self.watching"
  :notify="self.watchNotify"
  :watcher-count="self.watcherCount"
  :can-manage="!!(self.can && self.can.manage)" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `register` | String | — (required) | Register slug of the record. |
| `schema` | String | — (required) | Schema slug of the record. |
| `objectId` | String | — (required) | Id of the record. |
| `watching` | Boolean | `false` | Whether the current user follows the record (`@self.watching`). |
| `notify` | Boolean | `null` | Whether the user's follow notifies them (`@self.watchNotify`). Null reads as on. |
| `compact` | Boolean | `false` | Icon only, without the bell, count or popover. |
| `watcherCount` | Number | `null` | Number of followers (`@self.watcherCount`). Null hides the count and the popover. |
| `canManage` | Boolean | `false` | Whether the user may add and remove other followers (`@self.can.manage`). |
| `notifies` | Boolean | `true` | Whether following sends change notifications. False changes the tooltip to say it does not. |
| `currentUser` | String | `''` | User id of the current user. Defaults to Nextcloud's `OC.currentUser`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `{ watching, notify, count }` | After a successful call. `notify` is null after an unfollow. |
| `error` | `string` | A call failed; the message that was shown. |
| `not-found` | — | The call answered 404: the record went away or access was withdrawn. |

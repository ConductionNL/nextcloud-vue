# CnFavouriteToggle

A star bound to a record's `@self.favourite` marker (OpenRegister `favourites-and-recent`). `CnDetailPage` renders it beside the title when the object carries the marker; `CnIndexPage` renders one per row for `showFavouriteColumn`.

A click flips the star at once and sends `PUT` (star) or `DELETE` (unstar) `/apps/openregister/api/objects/{register}/{schema}/{id}/favourite`. On failure the star flips back and the server's message is shown; on a 404 the message says the user can no longer see the record and `not-found` is emitted. The server's answer is written into the stored object's `@self`, so a list showing the same record agrees. The button carries `aria-pressed`.

## Usage

```vue
<CnFavouriteToggle
  register="pipelinq"
  schema="ticket"
  :object-id="ticket.id"
  :favourite="ticket['@self'].favourite" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `register` | String | — (required) | Register slug of the record. |
| `schema` | String | — (required) | Schema slug of the record. |
| `objectId` | String | — (required) | Id of the record. |
| `favourite` | Boolean | `false` | Whether the record is currently starred (`@self.favourite`). |
| `addLabel` | String | `'Add to favourites'` | Accessible label when the record is not starred. |
| `removeLabel` | String | `'Remove from favourites'` | Accessible label when the record is starred. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `{ favourite }` | After a successful call. |
| `update:favourite` | `boolean` | The new state, for `v-model:favourite`. |
| `error` | `string` | The call failed; the message that was shown. |
| `not-found` | — | The call answered 404: the record went away or access was withdrawn. |

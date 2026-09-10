# CnLockIndicator

The padlock that says a record **in a list** is locked. Rendered automatically by [`CnObjectCard`](./cn-object-card.md) beside the card title and by [`CnDataTable`](./cn-data-table.md) in the first data cell of every row, so cards, tables and lists all report a lock the same way.

Renders **nothing at all** when the record is not locked, so it is safe to place unconditionally in a row template and an unlocked list is unchanged.

> Before this component, a lock was invisible until you opened the record: [`CnLockedBanner`](./cn-locked-banner.md) told you on the detail page, and nothing told you in a list. In a queue of forty cases that was forty clicks to find out which three you could not touch.

Non-blocking by design — the row still opens. Whether an edit is allowed is the detail page's answer to give, with its reasons; a list that refuses the click can only say no.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | `object \| null` | `null` | The record to inspect. Read directly — no store, no request — so a grid of many rows costs nothing per row. Accepts both the `@self` envelope and a flattened record. |
| `size` | `number` | `16` | Icon size in pixels. |
| `showLabel` | `boolean` | `false` | Print a short word beside the padlock. Off by default: in a dense table the icon plus its tooltip carries the meaning, and a repeated word costs a column's worth of width. |

## Tones

| Situation | Colour | Icon | Accessible name |
|-----------|--------|------|-----------------|
| Locked by someone else | warning | `LockAlertOutline` | "Locked by {user}" |
| Locked by you | neutral | `LockOutline` | "Locked by you" |
| Not locked, or lock expired | — | — | nothing is rendered |

**An expired lock is not a lock.** The server does not sweep expired locks — expiry is evaluated on read — so a surface that only checks for the key's presence paints padlocks on records anyone may edit, which trains people to ignore the padlock.

## Usage

```vue
<CnLockIndicator :object="row" />
```

With a word beside it, for a roomier surface:

```vue
<CnLockIndicator :object="row" :size="20" show-label />
```

## Reading lock state yourself

The same rules are available as plain functions for code that is not rendering an indicator — see [`objectLock`](../utilities/object-lock.md):

```js
import { resolveObjectLock } from '@conduction/nextcloud-vue'

const { locked, byMe, holder, expiresAt } = resolveObjectLock(record)
```

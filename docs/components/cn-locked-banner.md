# CnLockedBanner

The card that says the current object is locked, and by whom. Mounted automatically by [`CnDetailPage`](./cn-detail-page.md) under the page title whenever `useObjectLock().locked === true` — for **any** active lock, not only a remote one.

Two tones, because the two situations are not the same problem:

| Situation | Tone | Action |
|-----------|------|--------|
| Locked by someone else | Error card (`role="alert"`) naming the holder | none — the lock is theirs to release |
| Locked by you | Neutral card (`role="status"`) | **Unlock** button, emitting `unlock` |

> The banner used to render only for a remote lock, which meant the one person who could do something about a stale lock — its holder — was the only person the UI never told about it.

For the same fact in a list, card grid or table, use [`CnLockIndicator`](./cn-lock-indicator.md).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lockedBy` | `string` | `''` | Display name (or username) of the user holding the lock. Comes from `useObjectLock().lockedBy`. |
| `lockedByMe` | `boolean` | `false` | Whether the lock belongs to the current user. Comes from `useObjectLock().lockedByMe`. Defaults to `false`, the safe reading: a host that does not pass it gets the error tone and no Unlock button. |
| `expiresAt` | `Date \| null` | `null` | Lock expiration. When set, renders an "Expires in N min" sub-line. |
| `showUnlock` | `boolean` | `true` | Whether to offer Unlock on the viewer's own lock. Set `false` on a read-only surface. |
| `unlocking` | `boolean` | `false` | Whether a release is in flight, so the button can disable itself and spin. |
| `message` | `string` | `''` | Override the rendered headline message. Empty renders the default line for the applicable tone. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `unlock` | — | The viewer asked to release their own lock. The component never calls `release()` itself: it holds no reference to the composable, and releasing on its own would leave the host unable to refetch or re-enable its editors afterwards. |

## Usage

```vue
<CnLockedBanner
  v-if="lock.locked"
  :locked-by="lock.lockedBy"
  :locked-by-me="lock.lockedByMe"
  :expires-at="lock.expiresAt"
  :unlocking="releasing"
  @unlock="onRelease" />
```

```js
async onRelease() {
  this.releasing = true
  try {
    await this.lock.release()
  } finally {
    this.releasing = false
  }
}
```

The `lock` object comes from [`useObjectLock`](../utilities/composables/use-object-lock.md). Mount the banner above any editor surface (form dialog, inline edit grid) so users know to wait.

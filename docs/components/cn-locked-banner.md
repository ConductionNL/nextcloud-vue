# CnLockedBanner

Inline notice that the current object is held by another session's pessimistic lock. Mounted automatically by [`CnDetailPage`](./cn-detail-page.md) when `useObjectLock().locked === true && lockedByMe === false`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lockedBy` | `string` | `''` | Display name (or username) of the user holding the lock. Comes from `useObjectLock().lockedBy`. |
| `expiresAt` | `Date \| null` | `null` | Lock expiration. When set, renders an "Expires in N min" sub-line. |
| `message` | `string` | `t('Locked by {user}')` | Override the rendered headline message. |

## Usage

```vue
<CnLockedBanner
  v-if="lock.locked && !lock.lockedByMe"
  :locked-by="lock.lockedBy"
  :expires-at="lock.expiresAt" />
```

The `lock` object comes from [`useObjectLock`](../utilities/composables/use-object-lock.md). Mount the banner above any editor surface (form dialog, inline edit grid) so users know to wait.

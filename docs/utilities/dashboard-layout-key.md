# dashboardLayoutKey

The user-preference key one dashboard page's layout is stored under.

## Signature

```js
dashboardLayoutKey(pageId: string): string
```

## Usage

```js
import { dashboardLayoutKey } from '@conduction/nextcloud-vue'

dashboardLayoutKey('Dashboard')   // 'dashboard-layout.Dashboard'
dashboardLayoutKey('MyWork')      // 'dashboard-layout.MyWork'
```

## Why it is spelled once

A read and a write that disagree about the key read as a layout that never persists: the save appears to work, the page reloads, and the manifest layout comes back with nothing saying why. Keying by page id is what keeps two dashboards in one app from overwriting each other.

An app that serves its own preference route can use this to name the record it stores.

## See also

- [`dashboardLayoutsPlugin`](../store/plugins/dashboard-layouts.md) — the reader and writer

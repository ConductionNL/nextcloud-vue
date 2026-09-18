# dashboardLayoutsPlugin

Lets one user keep their own arrangement of a manifest dashboard without changing what anybody else sees. The manifest layout stays the base and the reset target; the user's record is a thin overlay of geometry on top of it.

## The rule this plugin exists to hold

**The manifest wins on membership, the user wins on geometry.** A widget the admin removes disappears for everyone, stored record or not. A widget the admin adds appears for everyone, at the end of the user's grid. What the user owns is *where their widgets sit*, not *which widgets exist*.

Read the other way round, a stored record could resurrect a widget an admin deliberately took off the page, and nothing on screen would say why it was back.

## Usage

```js
import { createObjectStore, dashboardLayoutsPlugin } from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('myapp', {
  plugins: [dashboardLayoutsPlugin()],
})

const store = useMyStore()

const record = await store.loadDashboardLayout('dossiq', 'Dashboard')  // null when the user has none
await store.saveDashboardLayout('dossiq', 'Dashboard', grid)           // stores geometry only
await store.resetDashboardLayout('dossiq', 'Dashboard')                // back to the manifest
```

A page opts in with one manifest key:

```json
{ "id": "Dashboard", "type": "dashboard", "config": { "userLayout": true } }
```

A page without the key makes no layout request and behaves exactly as before.

## State

| Property | Type |
|----------|------|
| `dashboardLayouts` | `Record<string, { items: Array } \| null>` — the stored record per page id, `null` when the user has none |

## Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `loadDashboardLayout` | `(appId: string, pageId: string) => Promise<object\|null>` | Read this user's record. Answers `null` for no record **and** for a record with no items: to a page those are the same fact, and both mean "show the manifest". |
| `saveDashboardLayout` | `(appId: string, pageId: string, layout: Array) => Promise<boolean>` | Store the geometry. Only `widgetId`, `gridX`, `gridY`, `gridWidth` and `gridHeight` travel. An entry with no `widgetId` is dropped rather than stored nameless. |
| `resetDashboardLayout` | `(appId: string, pageId: string) => Promise<boolean>` | Drop the arrangement by writing an empty record, which reads back as "no arrangement" on every instance, including one whose preference endpoint has no delete. |

## Where it stores

Through [`writeUserPreference`](../../utilities/write-user-preference.md), not a second HTTP client. That helper already addresses the app's preference route, mirrors to the browser so a layout survives an instance without the endpoint, and refuses an SPA shell answering `200` with HTML. Records are keyed per page by [`dashboardLayoutKey`](../../utilities/dashboard-layout-key.md), so two dashboards in one app never overwrite each other.

## Why only geometry is stored

A record that carried the whole layout item would carry the widget's title, its style and its config too. The next manifest change would then be silently overridden by a copy the user never edited, and the admin's edit would appear not to have worked.

## See also

- [`mergeUserLayout`](../../utilities/merge-user-layout.md) — the merge rule, as a pure function
- [`dashboardLayoutKey`](../../utilities/dashboard-layout-key.md) — the preference key for one page

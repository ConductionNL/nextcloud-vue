# useUserPreferences

Reads and writes how a person likes the product, in Nextcloud's own per-user preferences.

Nine of this cluster's candidates are one preference each: a landing page, pinned navigation, a date display, the view each list reopens in, a row order. None of them belongs in a component store. A preference kept in a component store is gone on the next page, invisible on another device, and nowhere an administrator can look for it.

## Usage

```js
import { useUserPreferences, USER_PREFERENCE_KEYS } from '@conduction/nextcloud-vue'

const prefs = useUserPreferences('dossiq', { personalisation: manifest.personalisation })

const landing = await prefs.read(USER_PREFERENCE_KEYS.landingPage, 'Cases')
await prefs.write(USER_PREFERENCE_KEYS.dateDisplay, 'relative')
```

It addresses the app's own preferences endpoint, the same one `useWalkthrough` and `useSupportDialog` use:

```
GET  /apps/{appId}/api/preferences/{key}   ->  { value }
PUT  /apps/{appId}/api/preferences/{key}       { value }
```

Values are stored as JSON, so a list or a map survives the round trip. A per-browser mirror in `localStorage` answers before the GET does and carries the preference through a missing endpoint, an unauthenticated session or an offline browser.

## Options

| Option | Type | Description |
|---|---|---|
| `personalisation` | Object | The manifest's `personalisation` block: the app defaults and the instance switch. |
| `administered` | Object | Administered values, by key. |
| `http` | Object | An axios-shaped client. For tests. |
| `storage` | Object | A localStorage-shaped store. For tests. |

## What it returns

| Key | Description |
|---|---|
| `read(key, fallback?)` | The value, resolved across all three layers. |
| `write(key, value)` | Stores it. Returns `false` when the instance switched personal customisation off. |
| `resolve(key, personal?)` | Resolves without reading the server. |
| `values` | `Ref` of everything read so far, by key. |
| `loading` | `Ref<boolean>`. |
| `personalApplies` | `ComputedRef<boolean>`. `false` when an administrator switched the personal layer off. |
| `disabledReason` | `ComputedRef<string>`. What to tell the person when it is off. |

## Three layers, one order

App default, administered value, personal value. The person wins, then the administrator, then what the product ships.

`false` and `0` are choices, not absences. Only `undefined`, `null` and `''` fall through to the layer below. Reading `false` as unset is how a person who switched something off gets it switched back on.

## When customisation is switched off

An instance can turn the personal layer off. Then `personalApplies` is `false`, `write` refuses, and `read` does not even fetch the personal value, so a stale one cannot leak through.

Render the options as unavailable, with `disabledReason` beside them. Accepting a setting and then not applying it is the behaviour the switch exists to replace.

## The keys

| Constant | Key | Holds |
|---|---|---|
| `USER_PREFERENCE_KEYS.landingPage` | `cn_landing_page` | Page id the app opens on. |
| `USER_PREFERENCE_KEYS.pinnedMenu` | `cn_pinned_menu` | Menu ids this person pinned. |
| `USER_PREFERENCE_KEYS.dateDisplay` | `cn_date_display` | `absolute` or `relative`. |
| `USER_PREFERENCE_KEYS.lastUsedView` | `cn_last_used_view` | Record type to the view mode last used on it. |
| `USER_PREFERENCE_KEYS.menuOrder` | `cn_menu_order` | Menu ids in this person's own order. |

## Declaring the defaults

```json
{
  "personalisation": {
    "enabled": true,
    "landingPage": "Queue",
    "dateDisplay": "absolute",
    "rememberLastView": true,
    "pinnedMenu": ["Cases", "Queue"]
  }
}
```

## Next

Render a date the way this person reads dates with [`formatDateForDisplay`](../format-date-for-display.md), which never lets a relative date hide the date.

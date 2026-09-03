# builtinIntegrations

Ordered array of every built-in integration descriptor shipped by this library — the always-available ones that mirror OpenRegister's built-in PHP `IntegrationProvider`s, plus the bespoke leaf overrides that need a richer UI than the generic `CnIntegrationTab` / `CnIntegrationCard` pair.

Each descriptor maps onto a [`CnObjectSidebar`](../components/cn-object-sidebar.md) tab plus a compact widget for dashboard and detail surfaces.

Most consumers don't touch the array directly — call [`registerBuiltinIntegrations()`](./register-builtin-integrations.md) instead. Use it when you want to inspect or filter the set (registering a subset, reading `defaultSize` for a layout, listing `requiredApp` values for a capability probe).

## Signature

```js
import { builtinIntegrations } from '@conduction/nextcloud-vue'

builtinIntegrations.map((d) => d.id)
// ['files', 'notes', 'tags', 'tasks', 'audit-trail', 'version-history', …]
```

## Descriptor shape

Each entry is a ready-to-`register()` integration descriptor: `{ id, label, icon, requiredApp, order, group, referenceType, tab, widget, defaultSize }`. See the [registration shape](../integrations/registry.md#registration-shape) reference for the full contract.

## Importing a single descriptor

Every descriptor below is **also a named export of the package root**, so an app that wants one integration without registering the whole set can import it directly:

```js
import { flowIntegration, registerIntegration } from '@conduction/nextcloud-vue'

registerIntegration(flowIntegration)
```

> **Fixed in `2.1.0-vue3.16`.** Twenty-four of these twenty-six names were missing from the package barrel in every earlier release. The named import resolved to `undefined`, registering an undefined descriptor was a silent no-op, and the missing tab was indistinguishable from "that Nextcloud app is not installed on this instance". Only `talkIntegration` and `fieldInspectionIntegration` worked. `npm run check:integration-parity` now fails the build when a descriptor in `builtinIntegrations[]` is not exported from both barrels.

## The descriptors

### Core — always available (no `requiredApp`)

| export | id | order | group |
|---|---|---|---|
| `filesIntegration` | `files` | 1 | `core` |
| `notesIntegration` | `notes` | 2 | `core` |
| `tagsIntegration` | `tags` | 3 | `core` |
| `tasksIntegration` | `tasks` | 4 | `core` |
| `auditTrailIntegration` | `audit-trail` | 5 | `core` |
| `versionHistoryIntegration` | `version-history` | 6 | `core` |
| `sharesIntegration` | `shares` | 10 | `core` |

### Comms

| export | id | order | requiredApp |
|---|---|---|---|
| `calendarIntegration` | `calendar` | 20 | `calendar` |
| `contactsIntegration` | `contacts` | 21 | `contacts` |
| `contactmomentIntegration` | `contactmoment` | 22 | `pipelinq` |
| `emailIntegration` | `email` | 22 | `mail` |
| `talkIntegration` | `talk` | 23 | `spreed` |

`talkIntegration` also has a [dedicated page](./talk-integration.md).

### Docs

| export | id | order | requiredApp |
|---|---|---|---|
| `bookmarksIntegration` | `bookmarks` | 40 | `bookmarks` |
| `collectivesIntegration` | `collectives` | 41 | `collectives` |
| `mapsIntegration` | `maps` | 42 | `maps` |
| `photosIntegration` | `photos` | 43 | `photos` |

### Workflow

| export | id | order | requiredApp |
|---|---|---|---|
| `activityIntegration` | `activity` | 60 | `activity` |
| `analyticsIntegration` | `analytics` | 61 | `analytics` |
| `cospendIntegration` | `cospend` | 62 | `cospend` |
| `deckIntegration` | `deck` | 63 | `deck` |
| `flowIntegration` | `flow` | 64 | `workflowengine` |
| `formsIntegration` | `forms` | 65 | `forms` |
| `pollsIntegration` | `polls` | 66 | `polls` |
| `timeTrackerIntegration` | `time-tracker` | 67 | `timemanager` |
| `fieldInspectionIntegration` | `field-inspection` | 68 | — |

`fieldInspectionIntegration` also has a [dedicated page](./field-inspection-integration.md).

### External (via Integriq)

| export | id | order | requiredApp |
|---|---|---|---|
| `openprojectIntegration` | `openproject` | 31 | `openconnector` |
| `xwikiIntegration` | `xwiki` | 32 | `openconnector` |

## See also

- [`registerBuiltinIntegrations`](./register-builtin-integrations.md) — register the whole set onto a registry
- [`leafIntegrations`](./leaf-integrations.md) — the generic-component fallback set
- [`integrations`](./integrations.md) — the registry singleton
- [Pluggable integration registry guide](../integrations/registry.md)

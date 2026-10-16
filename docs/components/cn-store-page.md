---
sidebar_position: 16
---

# CnStorePage

Browse a remote OpenRegister registry for shareable items, and install one into this
instance. When no registry is configured, the page shows the items the app ships itself.

Mounted automatically by `CnPageRenderer` when a manifest page declares `type: "store"`
(ADR-080, ADR-114 Decision 4). `CnPageRenderer` flattens the page `config` into props, so
every key below can be written in the manifest.

**Wraps**: `NcTextField`, `NcButton`, `NcLoadingIcon`, `NcNoteCard`, `NcEmptyContent`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `app` | String | `''` | The app id. The only app-specific part of the request URL (`/apps/<app>/api/store/items`). Empty means no request and the not-configured note. |
| `title` | String | `''` | Page heading. Falls back to the page title, then to "Store". |
| `description` | String | `''` | Lead paragraph: what this app's store offers. |
| `kinds` | `Array<string>` | ADR-080 vocabulary | Kind quick-filters. Kinds the engine serves win over this prop. |
| `builtIn` | `Array<object>` | `[]` | Items the app ships itself, shown when the registry is not configured, does not answer, or offers nothing. Items the engine serves win over this prop. |
| `canInstall` | `Boolean\|null` | `null` | Whether the signed-in user sees Install on the remote cards, as the app resolved it. `true` shows it, `false` hides it from everyone, administrators included. `null` keeps the default: administrators only. |
| `canPublish` | `Boolean\|null` | `null` | Whether the signed-in user sees Publish, as the app resolved it. `null` means administrators only. Needs `publishRoute` as well. |
| `publishRoute` | `String\|Object` | `''` | Where Publish takes the user. A string is a route name; an object is a vue-router location. Empty means no Publish button. |
| `page` | Object | `{}` | A whole manifest page, for a host that renders the component directly. The flattened props win. |

## Who sees Install and Publish

The page does not know your app's groups. Your app resolves who may install and who may
publish, and passes the answer as `canInstall` and `canPublish`.

- Pass nothing and the page behaves as it always did: administrators see Install, nobody
  sees Publish.
- Publish only renders when you also set `publishRoute`. Publishing is your app's own
  surface, like install (ADR-080 Decision 3): what a publish sends, and which checks run
  before it, differ per app. The button navigates there and sends nothing itself.

:::caution Visibility is not authorization
`canInstall` and `canPublish` hide or show a button, nothing more. Your install and
publish endpoints must enforce the same rule on the server, for example with
`ActionAuthService::requireAction()` (ADR-023). A user can always call an endpoint without
the button.
:::

A manifest cannot compute a per-user answer by itself, so the app writes it into the page
config at boot, from its initial state:

```js
// main.js: learniq resolves both answers server-side from its action matrix
const storeAccess = loadState('learniq', 'storeAccess', {})
for (const page of manifest.pages.filter((p) => p.type === 'store')) {
	page.config = {
		...page.config,
		canInstall: storeAccess.install === true,
		canPublish: storeAccess.publish === true,
		publishRoute: 'CoursePackageExport',
	}
}
```

An older library version ignores the three keys (they fall through as attributes), so an
app can write them before it upgrades and keep the administrator default until then.

## Manifest configuration

```jsonc
{
  "id": "Store",
  "route": "/store",
  "type": "store",
  "title": "Store",
  "config": {
    "app": "learniq",
    "title": "Store",
    "description": "Find courses other schools share and install your own copy.",
    "publishRoute": "CoursePackageExport"
  }
}
```

## Endpoints it calls

| Method | Path | When |
|--------|------|------|
| GET | `/apps/<app>/api/store/items?q=&kind=` | On mount, on search and on a kind filter. |
| POST | `/apps/<app>/api/store/items/<slug>/install` | When the user chooses Install. The page renders the per-component report the app returns. |

Discovery runs through OpenRegister's `GenericStoreService`, so the SSRF guard, the
redirect refusal and the registry token stay on the server.

## Board look

Under the board look (board PqStore) the page draws:

- the title with Publish as the primary button beside the buildiq square (when Publish shows);
- chips with their counts: All, Installed, Updates available, then the kind chips, with the search on the right. The
  chips filter the loaded cards; the search asks the registry. `kindChips` names the kind chips, as ids or
  `{ value, label }` ("Connectors" for `adapter`); without it there is one chip per kind the store offers. A kind chip
  shows only while a loaded card has its kind;
- three cards a row (two, then one, as the column narrows): a 40px icon chip (`card.icon`, else a package), the title,
  "&lt;kind&gt; · &lt;publisher&gt;", a state pill ("Installed", "Update" or "Available"), the description, and a footer
  with the version ("Version 2.0.1, 2.1.0 is out" for an update) and one action: Open (`card.openUrl`), Install or
  Update. Install and Update stay hidden when the viewer may not install;
- a side column of at most 300px: what is installed from this store, an Updates card (when the registry last answered,
  how many updates are ready followed by `updatesNote`, and "Check now"), and the items that ship with the app;
- the `footnote`, when declared, under the page with an info icon.

```json
"config": {
  "app": "pipelinq",
  "publishRoute": "StorePublish",
  "kindChips": [{ "value": "adapter", "label": "Connectors" }],
  "updatesNote": "An update keeps your own changes to stages and queues.",
  "footnote": "Items come from the registry your administrator connected."
}
```

### Store item fields the board look reads (contract)

`installed` (boolean, "Installed" pill), `updateAvailable` (boolean, "Update" pill and action), `installedVersion` and
`latestVersion` (strings: the version line reads "Version {installedVersion}, {latestVersion} is out" for an update;
`version` stands in for `installedVersion`), `openUrl` (string, target of Open for an installed item) and `icon`
(registered icon name for the icon chip; a package icon without it).

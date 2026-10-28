## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `page` | Object | `{}` | The manifest page, for a host rendering the component directly; the flattened props win |
| `app` | String | `''` | The app id, the only app-specific value in the request URL |
| `kinds` | Array | the ADR-080 kinds | The kind quick-filters offered before the engine answers |
| `builtIn` | Array | `[]` | The app's own items, shown when no registry is configured |
| `canInstall` | Boolean | `null` | Whether the app lets this viewer install; `null` falls back to administrators |
| `canPublish` | Boolean | `null` | Whether the app lets this viewer publish; `null` falls back to administrators |
| `publishRoute` | String, Object | `null` | Where Publish leads; without it there is no Publish button |
| `kindLenses` | Array | `[]` | Board look: extra lens chips per item kind, `[{ kind, label }]` (for example Connectors) |

See the component source for the title and description props.

## Board look: the store item fields (contract)

Under the board look a catalogue card reads these optional fields of each store item: `installed` (boolean, shows the "Installed" pill), `updateAvailable` (boolean, shows "Update"), `openUrl` (string, where the Open action of an installed item goes) and `icon` (a registered icon name for the 40px chip, a package icon otherwise), besides `title`, `typeName` or `kind`, `publisher`, `description` and `version`.

## Board look: the page around the cards

Under the board look the page has the following parts:
- **Header:** a CnPageHeader (h1) with the buildiq square and Publish. A `{count}` in the description is filled with the number of items the registry returned.
- **Lens row:** chips for All, Installed and Updates available, one per `kindLenses` entry, each with its count, and the search to the right.
- **Side column:** the installed items with their `installedVersion` and an Update pill, an Updates card, and an "Included with {app}" card naming the `builtIn` items.

The Updates card shows "Last checked" from the engine's `checkedAt` (an ISO date-time in the search response), the number of updates and Check now.

An item with `updateAvailable` and `installedVersion` reads "Version {installedVersion}, {version} is out" in its footer.

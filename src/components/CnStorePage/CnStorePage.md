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

See the component source for the title and description props.

## Board look: the store item fields (contract)

Under the board look a catalogue card reads these optional fields of each store item: `installed` (boolean, shows the "Installed" pill), `updateAvailable` (boolean, shows "Update"), `openUrl` (string, where the Open action of an installed item goes) and `icon` (a registered icon name for the 40px chip, a package icon otherwise), besides `title`, `typeName` or `kind`, `publisher`, `description` and `version`.

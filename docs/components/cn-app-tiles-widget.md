# CnAppTilesWidget

The apps a person can open, as a grid of tiles. Registered as the `app-tiles` dashboard widget type. Each tile shows the app's icon, its name and a status dot. Pinned apps come first with a pin, and an app reported down carries "Outage". A filter field narrows the tiles by name. A "Most used" row offers the apps this reader opened most from the widget, with how often.

Without `content.apps` the tiles are the apps of Nextcloud's navigation, so the widget works with no configuration. The use counts stay in the reader's own browser.

Part of the dashboard widget library. See [CnAppTilesWidgetForm](./cn-app-tiles-widget-form.md) and [the widget library overview](./cn-widget-grid.md).

## Content

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | `'Apps'` | The heading beside the filter field (an i18n key). |
| `apps` | `object[]` | the navigation | `{ id, label, href, icon?, status? }` per app; `status: 'down'` marks an outage. |
| `pinned` | `string[]` | `[]` | App ids drawn first, with a pin. |
| `exclude` | `string[]` | `[]` | App ids left out. |
| `status` | `object` | `{}` | `{ [appId]: 'down' }` for an app of the navigation. |
| `showFilter` | `boolean` | `true` | Whether the filter field shows. |
| `showMostUsed` | `boolean` | `true` | Whether the "Most used" row shows. |
| `mostUsedLimit` | `number` | `4` | How many apps the "Most used" row offers. |

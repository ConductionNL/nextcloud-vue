# registerNcDashboardWidgets

Register an app's Nextcloud Dashboard widgets from configuration. Each widget is registered with `OCA.Dashboard.register(id, …)` and, when the Dashboard opens it, mounted as its own Vue app: [CnNcDashboardList](../components/cn-nc-dashboard-list.md) with the widget's `config`, or the widget's own `component` with its `props` and the widget's title. The app's translate is provided as `cnTranslate`, so config texts are translated in the app's catalogue.

The server side stays the app's: each id is what the app's PHP `IWidget::getId()` returns, and its `load()` adds the one script that calls this.

## Import

```js
import { registerNcDashboardWidgets } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function registerNcDashboardWidgets(
    widgets: Array<{ id: string, config?: object, component?: object, props?: object }>,
    options: { appId: string, setup?: (app: object) => void, dashboard?: object },
): string[]
```

| Name | Type | Description |
|------|------|-------------|
| `widgets` | `Array` | The widgets; an entry without an `id` is skipped |
| `options.appId` | `string` | The app id, for its translations |
| `options.setup` | `Function` | Called on each widget's Vue app before mounting, to `use` a pinia, say |
| `options.dashboard` | `object` | The `OCA.Dashboard` registry (default `window.OCA.Dashboard`) |

It returns the ids it registered, and none when the Dashboard is absent.

## Example

One entry script for every widget:

```js
import { registerNcDashboardWidgets } from '@conduction/nextcloud-vue'
import StartCaseWidget from './views/widgets/StartCaseWidget.vue'

registerNcDashboardWidgets([
  {
    id: 'dossiq_cases_overview_widget',
    config: {
      source: { register: 'dossiq', schema: 'case' },
      subtitle: '#{identifier}',
      href: '/apps/dossiq/cases/{id}',
      viewAll: { href: '/apps/dossiq/cases' },
      emptyText: 'No cases found',
    },
  },
  { id: 'dossiq_start_case_widget', component: StartCaseWidget },
], { appId: 'dossiq' })
```

The Dashboard draws the widget's title, so a widget's own component must not draw it again.

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

## The signal widgets as OpenRegister filters

Each signal is a filter OpenRegister runs, not a list the browser computes from a thousand rows. `params` take the filter tokens (`@me`, `@today`, `@today±Nd`), and an operator map (`{ deadline: { lt: '@today' } }`) goes out as `deadline[lt]=…`. OpenRegister's operators are `gt`, `gte`, `lt`, `lte`, `ne`, `in`, `notIn`, `isnull` and `like`, and `orNull: true` beside an operator also keeps rows where the field is empty. Metadata filters go under `'@self'`. Tokens resolve at any depth. These filters need the OpenRegister release that adds `orNull` and the `lastUserActivity` metadata field. Its aggregation endpoint ignores `orNull`, so take a widget's count from the list total, not from an aggregation. The examples are dossiq's; another app swaps in its own register, schema and fields.

Open cases (overview):

```js
{
  source: { register: 'dossiq', schema: 'case', params: { isFinalStatus: { ne: true, orNull: true }, _order: { deadline: 'asc' } } },
  subtitle: '#{identifier}',
  href: '/apps/dossiq/cases/{id}',
  viewAll: { href: '/apps/dossiq/cases' },
  emptyText: 'No open cases',
}
```

Overdue cases, the deadline before today, most overdue first:

```js
{
  source: { register: 'dossiq', schema: 'case', params: { isFinalStatus: { ne: true, orNull: true }, deadline: { lt: '@today' }, _order: { deadline: 'asc' } } },
  subtitle: '{deadline|days} days overdue',
  href: '/apps/dossiq/cases/{id}',
  viewAll: { href: '/apps/dossiq/cases' },
  emptyText: 'No overdue cases',
}
```

Deadline alerts, overdue or due within three days, earliest first:

```js
{
  source: { register: 'dossiq', schema: 'case', params: { isFinalStatus: { ne: true, orNull: true }, deadline: { lte: '@today+3d' }, _order: { deadline: 'asc' } } },
  subtitle: 'Due {deadline|date}',
  href: '/apps/dossiq/cases/{id}',
  emptyText: 'No deadline alerts',
}
```

Stalled cases, not touched by a person for seven days. `lastUserActivity` is stamped only on writes by a person, so a system recompute does not count as activity; an object nobody has written since the field arrived is empty, which `orNull` keeps in:

```js
{
  source: { register: 'dossiq', schema: 'case', params: { isFinalStatus: { ne: true, orNull: true }, '@self': { lastUserActivity: { lt: '@today-7d', orNull: true } }, _order: { '@self.lastUserActivity': 'asc' } } },
  subtitle: '{@self.lastUserActivity|days} days inactive',
  href: '/apps/dossiq/cases/{id}',
  emptyText: 'All cases active',
}
```

My tasks, from OpenRegister's task inbox (an endpoint, not an object list):

```js
{
  source: { url: '/apps/openregister/api/flow-tasks', params: { scope: 'assigned', isTerminal: 'false', sort: 'due' }, responsePath: 'results' },
  subtitle: 'Due {dueAt|date}',
  href: '/apps/dossiq/tasks/{uuid}',
  viewAll: { href: '/apps/dossiq/tasks' },
  emptyText: 'No tasks found',
}
```

Task reminders, open tasks overdue or due within three days:

```js
{
  source: { url: '/apps/openregister/api/flow-tasks', params: { scope: 'assigned', isTerminal: 'false', dueBefore: '@today+3d', sort: 'due' }, responsePath: 'results' },
  subtitle: 'Due {dueAt|date}',
  href: '/apps/dossiq/tasks/{uuid}',
  emptyText: 'No task reminders',
}
```

A task inbox row carries `uuid` and `dueAt`: the page link takes the uuid, because no route accepts the numeric `id`.

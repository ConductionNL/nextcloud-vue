# CnNcDashboardList

The compact list a Nextcloud Dashboard widget shows: a bold name, a muted trailing line, and a "View all" link, read from OpenRegister or any endpoint. A row opens its record in place, and a modifier or middle click opens a new tab, because the Nextcloud Dashboard has no app router. A failed read says so instead of showing an empty list.

[`registerNcDashboardWidgets`](../utilities/register-nc-dashboard-widgets.md) mounts it per widget id, so an app's dashboard widgets are configuration rather than one component and one entry script each.

## Usage

```js
{
  source: { register: 'dossiq', schema: 'case', params: { _order: { deadline: 'asc' } } },
  limit: 7,
  title: '{title}',
  subtitle: '#{identifier}',
  href: '/apps/dossiq/cases/{id}',
  viewAll: { href: '/apps/dossiq/cases', label: 'View all' },
  emptyText: 'No open cases',
}
```

## Config

| Key | Description |
|-----|-------------|
| `source` | `{ register, schema, params? }` for OpenRegister objects (rows in `results`), or an endpointSource `{ url, params?, responsePath? }` |
| `itemsPath` | The rows' path in the response, when it is not `results` or `responsePath` |
| `limit` | The most rows shown (default 7); also sent as `_limit` to OpenRegister |
| `title`, `subtitle` | Templates filled from a row (default `{title}` and none), through the app's translate |
| `due` | `{ field, ...due config }`: the trailing line says how the row's date stands, in place of `subtitle`: "3 days overdue", "Due today", the date of a day to come, or the days left with `upcomingLabel`, and `emptyText` without a date. The same config as a record-list's due date (`todayLabel`, `overdueLabel`, `upcomingLabel`, `emptyText`), through the app's translate |
| `href` | A template for a row's page; an app path goes through `generateUrl` |
| `viewAll` | `{ href, label? }` for the footer link |
| `emptyText` | Text for an empty list |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | Object | `{}` | The configuration above |

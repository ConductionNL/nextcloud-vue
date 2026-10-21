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
| `sources` | Several sources in place of `source`, each `{ ...source, href?, kind? }`; the rows merge, sorted newest first by `sortBy`, each opening its own source's `href`, and `kind` (through the app's translate) fills `{_kind}` |
| `valueLabels` | `{ field: { value: label } }`: a stored value shown by its label, through the app's translate, wherever a template names the field (`{ priority: { high: "High" } }`) |
| `due.withSubtitle` | Put the due text after the `subtitle` parts instead of in their place |
| `sortBy` | A dot-path to the date `sources` rows sort on (`@self.updated`) |
| `subtitle` (list) | A list of templates joined with a middle dot; an empty part drops out with its separator: `["{client.name}", "{value\|currency}", "{stage}"]` |
| `search` | `{ label?, placeholder?, param?, emptyText? }`: a search box; the server searches (`_search`, or `param`) as the user types, and `emptyText` with `{query}` says when it found nothing |
| `rowActions` | `[{ id, label, href? \| copy? \| create? }]`: a menu per row. `href` is a link template, `copy` a row field copied to the clipboard (hidden while the field is empty), `create` a [CnNcDashboardQuickCreate](./cn-nc-dashboard-quick-create.md) config opened inline with the row as its context |
| `create` | A CnNcDashboardQuickCreate config with a `label`, opened inline from a button beside the search; the list reads again after a create |

A client finder, searched on the server, with actions per row:

```js
{
  source: { register: 'pipelinq', schema: 'client' },
  limit: 20,
  title: '{name}',
  subtitle: ['{email}', '{phone}'],
  href: '/apps/pipelinq/clients/{id}',
  search: { placeholder: 'Search clients…', emptyText: 'No clients found for "{query}"' },
  rowActions: [
    { id: 'request', label: 'Create request', create: { register: 'pipelinq', schema: 'ticket', heading: 'New request for {name}', fields: [{ key: 'title', label: 'Title', required: true }], defaults: { client: '{id}', ticketType: 'request' }, successHref: '/apps/pipelinq/tickets/{id}', openAfterCreate: true } },
    { id: 'copy', label: 'Copy email', copy: 'email' },
  ],
  create: { label: 'New client', register: 'pipelinq', schema: 'client', fields: [{ key: 'name', label: 'Name', required: true }] },
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | Object | `{}` | The configuration above |

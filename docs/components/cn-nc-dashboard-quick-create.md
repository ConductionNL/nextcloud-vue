# CnNcDashboardQuickCreate

A short create form for a Nextcloud Dashboard widget ("New lead", "Start a request"): a few fields, a submit that writes one OpenRegister object, and a link to what was made. A required field left empty is marked, and a failed create says so and keeps what was typed. Option labels are shown translated while the stored value stays the option's `value`.

[`registerNcDashboardWidgets`](../utilities/register-nc-dashboard-widgets.md) mounts it for a widget declared `{ id, type: "quick-create", config }`, and [CnNcDashboardList](./cn-nc-dashboard-list.md) opens it inline from a row action or its create button.

## Usage

```js
registerNcDashboardWidgets([
  {
    id: 'pipelinq_create_lead_widget',
    type: 'quick-create',
    config: {
      register: 'pipelinq',
      schema: 'lead',
      fields: [
        { key: 'title', label: 'Title', required: true },
        { key: 'client', label: 'Client', type: 'object', register: 'pipelinq', schema: 'client' },
        { key: 'pipeline', label: 'Pipeline', type: 'select', optionsFrom: { register: 'pipelinq', schema: 'pipeline' }, default: 'first' },
        { key: 'value', label: 'Value', type: 'number' },
      ],
      defaults: { status: 'open' },
      derive: { stage: { from: 'pipeline', path: 'stages', sortBy: 'order', field: 'name' } },
      submitLabel: 'Create lead',
      successText: 'Lead created',
      successLinkText: 'View lead',
      successHref: '/apps/pipelinq/leads/{id}',
    },
  },
], { appId: 'pipelinq' })
```

## Config

| Key | Description |
|-----|-------------|
| `register`, `schema` | Where the object is created |
| `fields` | `[{ key, label, type?, required?, placeholder?, options?, optionsFrom?, default?, labelField? }]`. `type` is `text` (default), `number`, `select` or `object`. A `select` takes `options: [{ value, label }]` (labels through the app's translate) or `optionsFrom: { register, schema, filter?, valueField?, labelField? }`; `default: "first"` picks the first option. An `object` field searches `register`/`schema` objects on the server as the user types, stores the id and shows `labelField` (default `name`). Any other `default` is the field's starting value |
| `defaults` | Values written with every create. Filter tokens resolve (`@now`, `@me`) and string templates fill from `context` (`"{id}"`) |
| `derive` | `{ target: { from, path, sortBy?, field } }`: a value read from the option chosen for field `from`; `{ stage: { from: "pipeline", path: "stages", sortBy: "order", field: "name" } }` writes the first stage of the chosen pipeline |
| `heading` | A line above the form, filled from `context` ("New request for {name}") |
| `submitLabel`, `successText`, `successLinkText`, `againLabel` | Texts, through the app's translate |
| `successHref` | A template for the created object's page; an app path goes through `generateUrl` |
| `openAfterCreate` | Go to `successHref` at once instead of showing the success note |
| `list` | A [CnNcDashboardList](./cn-nc-dashboard-list.md) config shown under the form ("Recent requests"), read again after a create |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | Object | `{}` | The configuration above |
| `context` | Object | `{}` | The record the form was opened on, for `defaults` and `heading` templates |
| `cancelable` | Boolean | `false` | Show a Cancel button that emits `cancel` |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `created` | The created object, with its `id` | After a successful create |
| `cancel` | none | The Cancel button was pressed |

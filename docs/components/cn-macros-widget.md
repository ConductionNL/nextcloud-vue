# CnMacrosWidget

The macros of a record, each with a button that runs it: `type: "macros"` on a detail page.

A macro is an object action whose body is a flow or inline steps. The widget shows the actions OpenRegister lists for
the record (`GET /api/objects/{register}/{schema}/{id}/actions`, see
[useObjectActions](../utilities/composables/use-object-actions.md)) of kind `flow` or `steps`:

- an action the person may not run is absent;
- one that cannot run now is disabled, with its reason under its name;
- one with inputs, confirm text or `mode: "async"` opens [CnObjectActionDialog](./cn-object-action-dialog.md).

It runs the pressed one through `POST /api/objects/{register}/{schema}/{id}/actions/{action}`, as the person and under
the action's own right, and asks the page to refresh (`cn:page:refresh`). The last run is read from the record's action
history, `action.run` and the older `action.macro` alike; when it cannot be read the line is left out.

On an OpenRegister without the actions list (the route answers 404) the widget reads the schema's declared macros
(`configuration['x-openregister-action']` with `macro: true` and a bound flow) and the audit trail, as before.

## Content

| Key | Type | Description |
|---|---|---|
| `description` | `string` | The line under the title, translated. |
| `emptyText` | `string` | Shown when the record has no macros, translated. |
| `macrosFrom` | `string` \| `object` | Where the macro keys this record shows come from, in that order: a path on the record (`@context.caseType.macros`, the detail page's `@context` records included), or an endpoint `{ url, method?, params?, responsePath? }` whose answer is the list (tokens such as `@objectId` resolve). A record that lists none, or an endpoint that refuses, shows none. Without it every listed macro shows. It works as `include` does for `actionsFrom`. |

## Example

```json
{ "id": "case-macros", "type": "macros", "title": "Macros", "content": { "description": "Several steps at once; then you see what changed" } }
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The widget's content above: `description`, `emptyText` and `macrosFrom` |
| `objectData` | Object | `null` | The bound record |
| `objectId` | String \| Number | `''` | The bound record's id |

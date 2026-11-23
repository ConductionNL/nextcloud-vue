# CnMacrosWidget

The macros a record's schema declares, each with a button that runs it: `type: "macros"` on a detail page.

A macro is an OpenRegister declared action (`configuration['x-openregister-action']`) with `macro: true` and a bound
manual flow. The widget lists them in declaration order and runs the pressed one through
`POST /api/objects/{register}/{schema}/{id}/actions/{action}`, as the person and under the action's own right. After a
run it asks the page to refresh (`cn:page:refresh`). The last run is read from the record's audit trail
(`action.macro`); when the trail cannot be read the line is left out.

## Content

| Key | Type | Description |
|---|---|---|
| `description` | `string` | The line under the title, translated. |
| `emptyText` | `string` | Shown when the schema declares no macros, translated. |

## Example

```json
{ "id": "case-macros", "type": "macros", "title": "Macros", "content": { "description": "Several steps at once; then you see what changed" } }
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The widget's content above: `description` and `emptyText`, both translated |
| `objectData` | Object | `null` | The bound record |
| `objectId` | String \| Number | `''` | The bound record's id |

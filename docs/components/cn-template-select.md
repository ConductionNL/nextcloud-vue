# CnTemplateSelect

A select of named templates that hands the chosen one to the form that mounts it.

## Sources

- `schema` (the default source): the OpenRegister record templates of that schema the signed-in user may use, `GET /apps/openregister/api/record-templates?schema=`. OpenRegister compares the schema as text, so pass it exactly as the register configuration holds it.
- `url` and `params`: any endpoint answering a list under `results`, `items` or as a bare array, such as an app's content templates of one kind. An app-absolute `/apps/...` url gets the instance prefix.

## Usage

```vue
<CnTemplateSelect
  schema="searchPlan"
  :input-label="t('myapp', 'Start from a template')"
  @apply="fill" />

<CnTemplateSelect
  url="/apps/myapp/api/content-templates/result"
  :params="{ caseType, case: caseId }"
  :map-option="(row) => (row.id ? { id: row.id, name: row.name, body: row.body, presets: row.presets || {} } : null)"
  :input-label="t('myapp', 'Result template')"
  data-testid="template-picker"
  @apply="applyTemplate" />
```

## Behaviour

It hides itself while there is nothing to offer: an empty list, and a list that could not be read. A failed read also says so in a toast ("Could not read the templates"), so "there are none" and "they could not be read" stay two answers. It reads again when the source changes and never shows a list from an earlier scope.

A host's `data-testid` lands on the select itself, which is what a test clicks.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | String | `''` | The schema whose record templates are offered |
| `url` | String | `''` | An endpoint to read templates from instead |
| `params` | Object | `{}` | Query parameters for `url` |
| `mapOption` | Function | record template | `(row) => ({ id, name, ...anything })`, or null to skip the row |
| `inputLabel` | String | required | The select's accessible label |
| `placeholder` | String | `''` | Placeholder; defaults to "Pick a template" |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `apply` | the chosen option, or `null` when cleared | A record template is `{ id, name, values }` |

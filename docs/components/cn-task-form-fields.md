# CnTaskFormFields

The fields of an OpenRegister task form, inline: one input per declared field in the declared order, required when the declaration says so. A declared field the schema no longer offers is a disabled row with the server's reason, and says who fixes it when it is required. A form that cannot be rendered (`unresolvable`, an unavailable external form, or `broken` with no fields left) shows the server's sentence; an external form says the task is finished in its own form.

The parent holds the answers: each input emits `answer` and the parent writes. [CnTasksWidget](./cn-tasks-widget.md) renders it in its work cards, and [CnTaskFormDialog](./cn-task-form-dialog.md) draws its unavailable rows through it.

## Usage

```vue
<CnTaskFormFields
  :form="task.form"
  :values="answers"
  idPrefix="case-task-form"
  @answer="({ field, value }) => answers = { ...answers, [field]: value }" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `form` | Object | required | The form as the engine describes it: `{ kind, state, error, fields }`, each field `{ field, label?, required, renderable, reason, order }`. |
| `values` | Object | `{}` | The answers so far, keyed by field. |
| `idPrefix` | String | `'cn-task-form-fields'` | Prefix of the input ids and test ids, so two forms on one page stay apart. |
| `brokenOnly` | Boolean | `false` | Draw only the declared fields the form cannot show. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `answer` | `{ field, value }` | One answer typed. |

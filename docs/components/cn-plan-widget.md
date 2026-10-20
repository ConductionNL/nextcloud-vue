# CnPlanWidget

The `plan` detail widget: a record's planned steps (stages, tasks and milestones) as OpenRegister's case layer holds them. It reads them from `/apps/openregister/api/cases/{id}` and offers the moves OpenRegister allows: start an item that may be started, and complete or stop one. Any app whose records run on OpenRegister's case layer uses it; dossiq's adaptive case plan is the first.

- It judges nothing. The moves are advisory, OpenRegister decides each one, and a refusal is shown as OpenRegister words it.
- After a move it reads the plan again rather than patching its rows, because one move can cascade. It then refreshes the page.
- A 404 means the record has no plan and shows `emptyText`. Any other failure is an error with a retry, never an empty plan: "no work left" and "OpenRegister did not answer" must not look alike.

## Usage

```json
{
  "id": "case-plan",
  "type": "plan",
  "content": { "emptyText": "This case type has no adaptive plan" }
}
```

Place it only where a plan can exist, with the widget's `visibleWhen`, so records without one do not ask.

## Content

| Key | Description |
|-----|-------------|
| `emptyText` | Text when the record has no plan, through the app's translate |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The configuration above |
| `objectData` | Object | `null` | The bound record on a detail page; its id is the plan's |
| `objectId` | String \| Number | `''` | The record's id, overriding the bound record's |

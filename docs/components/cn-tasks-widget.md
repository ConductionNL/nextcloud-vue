# CnTasksWidget

The viewer's open tasks, from OpenRegister's task inbox. Reads the `flow-tasks` surface with `isTerminal=false` and renders one row per task: its title, its subject, its state in words, and its due date with overdue spelled out. Registered under the `tasks` type and configured by [`CnTasksWidgetForm`](./cn-tasks-widget-form.md).

Every Conduction app runs its human tasks on OpenRegister's one task store (ADR-098), so "what is waiting for me" has a single answer per viewer. That is what makes this widget app-agnostic: an app places it and its users see their work without the app shipping a controller, a store or a view. The full inbox page is the same story: a manifest `type: "index"` page with `config.entitySource: "tasks"` (see [CnIndexPage](./cn-index-page.md)).

## Content shape

```json
{
  "scope": "assigned",
  "limit": 6,
  "pollSeconds": 30,
  "rowRoute": "TaskDetail",
  "emptyText": "No open tasks"
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The widget config blob (`scope`, `limit`, `pollSeconds`, `rowRoute`, `emptyText`). |
| `widgetId` | `string` | `''` | Placement id, so the per-widget Refresh action (`cn:widget:refresh`) reaches this instance. |
| `translate` | `Function` | `null` | Translate function. Falls back to the injected `cnTranslate`. |

## Quick actions

Rows offer only what the row's contract can accept, through the shared `NcActions` menu:

- **Claim** on a pooled row: no assignee and not terminal.
- **Complete** on the viewer's own open row. A row that declares an `outcomes` list gets one entry per outcome; without one, a single complete sends the server's default outcome.

The offer is a heuristic and the server still authorizes. A refused verb (400, 403, 404, 409) surfaces the endpoint's own `error` message as a toast, and the widget refetches either way: a lost claim race corrects the row instead of lying about it.

## Notes

- **Whose inbox.** `scope` picks the relationship (`assigned`, `pooled`, `watched`, `all`); whose inbox it is stays the endpoint's session decision. The widget never names another user.
- **Open tasks only.** The read carries `isTerminal=false`. An inbox widget that showed finished tasks would never drain; the index page's "everything" tab is the place to read history.
- **The count is honest.** The count line and the "+N more" remainder come from the server `total`, never from the rendered length (ADR-062). `limit` caps rows between 1 and 50, default 6.
- **Overdue survives monochrome.** The due cell says "Overdue by N days" in words, with weight and colour only reinforcing it.
- **It polls.** Tasks are handed out and completed by other people and by flows. `pollSeconds` defaults to 30, is floored at 5, and `0` disables polling. Polling pauses while the tab is hidden and refetches once on return.
- **Row clicks.** With `rowRoute` set, a click opens that route with the task uuid as `:id`. Without one, the click opens the task's openregister deep link (`/apps/openregister/flow-tasks/{uuid}`), which ships with openregister's `flow-task-inbox-projections`.
- **Three states.** Loading, a failed read ("Could not load the tasks", never the raw status text) and an empty inbox ("No open tasks", or `emptyText`) render differently.
- Requires OpenRegister. Without it the endpoint 404s and the widget shows its error line.

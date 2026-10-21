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
  "emptyText": "No open tasks",
  "variant": "list",
  "viewAllRoute": { "name": "Tasks" },
  "viewAllLabel": "View all"
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The widget config blob (`scope`, `limit`, `pollSeconds`, `rowRoute`, `emptyText`, `variant`, `viewAllRoute`, `viewAllLabel`, `objectUuid`, `includeDone`, `create`, `completeAny`, `cancel`, `expandRows`, `completeUrl`, `claimCapabilityUrl`). |
| `widgetId` | `string` | `''` | Placement id, so the per-widget Refresh action (`cn:widget:refresh`) reaches this instance. |
| `objectId` | `string \| number` | `''` | The page's record id, for `objectUuid: "@objectId"` in the content. |
| `translate` | `Function` | `null` | Translate function. Falls back to the injected `cnTranslate`. |

## List variant

`"variant": "list"` draws the board's My tasks card: a checkbox, the task title, the subject (the case the task sits on) on a muted second line and the due date at the right, with overdue spelled out in words and weight. The default stays the compact rows with state and priority words.

- **The checkbox completes the task** with the server's default outcome, then the list refetches. It shows on the viewer's own open tasks that declare no outcome list.
- A task that declares outcomes, or is not the viewer's, keeps the quick-actions menu and gets a spacer where the checkbox would be, so the titles stay aligned.
- The list variant has no count line; the "+N more" line stays.

## View all link

`viewAllRoute` (a route name, or a location `{ name, params?, query? }`) and `viewAllLabel` (default "View all", translated) put a text link in the card header. A `headerLink` in the content works the same way. A dashboard card shows it through the wrapper's header link; a detail page card shows it through the widget's `header` event. A link set on the placement or the widget definition wins over the content.

## Quick actions

Rows offer only what the row's contract can accept, through the shared `NcActions` menu:

- **Claim** on a pooled row: no assignee and not terminal.
- **Complete** on the viewer's own open row. A row that declares an `outcomes` list gets one entry per outcome; without one, a single complete sends the server's default outcome.

The offer is a heuristic and the server still authorizes. A refused verb (400, 403, 404, 409) surfaces the endpoint's own `error` message as a toast, and the widget refetches either way: a lost claim race corrects the row instead of lying about it.

## Working on a record's tasks in place

On a record page (`objectUuid: "@objectId"`) the widget can let a handler finish the task they came for without leaving the record:

- **`variant: "focus"`** shows the first open task as a card: its number (or its uuid, "no number yet"), handler, deadline, lock ("Not tracked" when the engine keeps none), who it is offered to, its form inline ([CnTaskFormFields](./cn-task-form-fields.md)) and Claim, Complete and Cancel task. The other open tasks are listed under it with their own verbs. A required field left empty is named before the request goes out.
- **`expandRows: true`** in the table makes a row's title a toggle (`aria-expanded`) that opens that task in the same card under the table; the card's title links to `rowRoute`.
- **`completeUrl`** sends Complete to an app route instead of the engine's (`/apps/dossiq/api/case-tasks/{id}/complete`, which checks the case type's form and effects first). [CnTaskFormDialog](./cn-task-form-dialog.md) takes the same route.
- **`claimCapabilityUrl`** gates Claim on what the engine can do: the URL answers `{ "claim": true }` or `false`, and a failed read leaves Claim off. Where claim is off, an offered task says to assign it instead.
- **A task that carries a form** opens CnTaskFormDialog from Complete in the table and the lists, and fills its form inline in the cards.

A finished task toasts "Task {title} finished", a claim "Task {title} is yours"; a refusal shows the server's own sentence.

```json
{ "id": "case-tasks", "type": "tasks", "title": "Tasks",
  "content": { "variant": "table", "objectUuid": "@objectId", "includeDone": true, "completeAny": true, "cancel": true,
    "create": { "label": "New task" }, "expandRows": true, "rowRoute": "TaskDetail", "limit": 25,
    "completeUrl": "/apps/dossiq/api/case-tasks/{id}/complete",
    "claimCapabilityUrl": "/apps/dossiq/api/case-tasks/capabilities" } }
```

## Notes

- **Whose inbox.** `scope` picks the relationship (`assigned`, `pooled`, `watched`, `all`); whose inbox it is stays the endpoint's session decision. The widget never names another user.
- **Open tasks only.** The read carries `isTerminal=false`. An inbox widget that showed finished tasks would never drain; the index page's "everything" tab is the place to read history.
- **The count is honest.** The count line and the "+N more" remainder come from the server `total`, never from the rendered length (ADR-062). `limit` caps rows between 1 and 50, default 6.
- **Overdue survives monochrome.** The due cell says "Overdue by N days" in words, with weight and colour only reinforcing it.
- **It polls.** Tasks are handed out and completed by other people and by flows. `pollSeconds` defaults to 30, is floored at 5, and `0` disables polling. Polling pauses while the tab is hidden and refetches once on return.
- **Row clicks.** With `rowRoute` set, a click opens that route with the task uuid as `:id`. Without one, the click opens the task's openregister deep link (`/apps/openregister/flow-tasks/{uuid}`), which ships with openregister's `flow-task-inbox-projections`.
- **Three states.** Loading, a failed read ("Could not load the tasks", never the raw status text) and an empty inbox ("No open tasks", or `emptyText`) render differently.
- Requires OpenRegister. Without it the endpoint 404s and the widget shows its error line.

## Board look

In the board look the card's "New task" button is 40px high and 16px in at both sides (DqZaakTaken); a row's Complete stays 34px.

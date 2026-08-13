# CnFlowRunsWidget

The live flow runs for the viewer's organisation. Reads OpenRegister's `flow-runs/active` surface and renders one row per run — its flow's name, what triggered it, the step it currently sits on, and how long it has been going. Registered under the `flow-runs` type and configured by [`CnFlowRunsWidgetForm`](./cn-flow-runs-widget-form.md).

Every Conduction app runs its flows on OpenRegister's one flow engine (ADR-065), so "what is running right now" has a single answer for the whole instance. That is what makes this widget app-agnostic: an app places it and its users see their live runs without the app shipping a controller, a store or a view.

## Content shape

```json
{
  "limit": 6,
  "pollSeconds": 15,
  "rowRoute": "GraphDetail",
  "emptyText": "No flows are running"
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The widget config blob (`limit`, `pollSeconds`, `rowRoute`, `emptyText`). |
| `widgetId` | `string` | `''` | Placement id, so the per-widget Refresh action (`cn:widget:refresh`) reaches this instance. |
| `translate` | `Function` | `null` | Translate function. Falls back to the injected `cnTranslate`. |

## Notes

- **Which runs.** All NON-terminal statuses: `queued`, `running` and `suspended`. Filtering to literally `running` would show an empty widget almost always — a run holds that status only during a worker pass, while queued and suspended are where live runs actually wait.
- **Scoping is server-side.** The endpoint returns only the caller's organisation's runs, and returns nothing when no organisation resolves. The widget never filters by tenant itself.
- **It polls.** A widget titled "running flows" that only reflected the moment the dashboard mounted would be wrong within seconds and would look identical to being right. `pollSeconds` defaults to 15, is floored at 5, and `0` disables polling. Polling pauses while the browser tab is hidden and refetches once on return.
- **Row clicks are opt-in.** With no `rowRoute` the rows are not clickable, which is correct for an app that has no flow page. When set, the route receives the run's FLOW id as `:id` — a click on a live run means "show me this flow".
- **Empty is normal.** Nothing running renders one muted line, not an illustration and not an error.
- Requires OpenRegister. Without it the endpoint 404s and the widget shows its error line.

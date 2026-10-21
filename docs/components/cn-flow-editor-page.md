# CnFlowEditorPage

The flow canvas — manifest page type `flow-detail`.

Mounts the shared [`CnFlowDetail`](cn-flow-detail.md) node/edge canvas over OpenRegister's one native flow store (ADR-065, ADR-098), scoped to the owning app. Pair it with a [`CnFlowsPage`](cn-flows-page.md) at `/flows`; this one takes `/flows/:id`.

## Manifest usage

```json
{
  "id": "FlowDetail",
  "route": "/flows/:id",
  "type": "flow-detail",
  "title": "Flow",
  "config": { "app": "dossiq" },
  "sidebarComponent": "FlowDetailSidebar"
}
```

Controls belong in Nextcloud's app sidebar so the canvas keeps the full width — declare `sidebarComponent`, or mount `CnFlowSidebar` yourself. Canvas and sidebar share `useFlowStore`, which is why neither needs props from the other.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `app` | `String` | `null` | The owning app id, stamped on a flow created here so the app-scoped list finds it again. Omit only on the fleet-wide surface. |
| `id` | `String` | `''` | The flow id to open. Defaults to the `id` route param, which is the normal case; pass it explicitly only when mounting outside a route. The literal `new` opens an unsaved flow. |
| `detailRoute` | `String` | `'/flows'` | Route path the editor lives under, used to swap the URL once a new flow gets its server-assigned id. |
| `run` | `String` | `''` | The run to show. Defaults to the `run` query parameter (`/flows/:id?run=:uuid`), which opens the run view. |
| `look` | `String` | `''` | `board` or `nextcloud`, overriding the app's look for this page (`config.look`). |
| `palette` | `String` | `'picker'` | Board look: `column` draws the step palette as a card left of the canvas, grouped by the app that provides each step (each group named by the app's display name from Nextcloud's navigation, its id when it has none, and the app that owns the flow first); `picker` keeps "Add a step" in the canvas toolbar (`config.palette`). |
| `paletteFootnote` | `String` | `''` | Board look: a line under the palette (`config.paletteFootnote`, translated). |
| `flowDirection` | `String` | `'right'` | Board look: `down` lays the steps out top to bottom and opens them at their own size (`config.flowDirection`, DqFlow); `right` left to right, fitted. |
| `testSubject` | `Object` | `null` | Board look: `{ register, schema, labelField?, label? }` (`config.testSubject`). Draws a header button ("Testen met een zaak") that opens a picker on that register and schema and runs the saved flow once with the picked record as its subject. `label` is translated; without it the button reads "Test with a record". |
| `notice` | `String` | `''` | Board look: an info notice under the path (`config.notice`, translated). |
| `pill` | `String` | `''` | Board look: the pill beside the flow's name, such as "Case type flow" (`config.pill`, translated). Empty shows Draft or Retired for a flow in that state. |
| `listLabel` | `String` | `''` | Board look: the list's name at the start of the path, such as "Settings / Flows" (`config.listLabel`, translated). Empty reads "Flows". |

## The board look

In the board look the page draws the flow as boards PqFlow, PqFlowRun and DqFlow do: a header with the flow's name, a pill, Active, Check, Run (for a flow with a manual start) and Save; a path line ("Flows / name · trigger · steps · version"); the canvas in a dotted card with a validity bar under it ("The flow is valid" after Check); and an inspector card on the right. With no step selected the inspector says to select one, with Show runs to open the flow's runs (Run opens them too, and selecting a step returns to it); with a step selected it names the step, lists its settings as the step's owner labels them in the catalogue's `configForm` (a select's option label, Yes or No for a switch), opens its editor, lists its recent log lines from the flow's last runs and offers Delete step and Done.

With `?run=` the same page is the run view: each step's outcome on the canvas with a legend, and in the inspector a run card (outcome, start, duration, what started it, steps run of total, Run again, Back to the flow) above two tabs, This step and Logs of the whole run. A step that wrote its own lines (`report.lines` in the run log) shows them; any other step reads as one line from its status, duration and error. Leave `sidebarComponent` off a board-look flow page: the inspector replaces the app sidebar.

## The route swap on first save

A newly created flow gets its id from the server. Without the swap the URL stays on `new`, and a reload lands back on an empty canvas having lost the flow that was just saved.

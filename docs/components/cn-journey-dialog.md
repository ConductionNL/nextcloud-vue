# CnJourneyDialog

The journey renderer in a modal: a `NcDialog` around `CnJourney`. Closing the dialog never discards staged answers. They are saved to the run as each step completes and the dialog keeps its run store, so opening it again (`open` back to true) resumes at the recorded step with the same answers. A run started here resumes in a page with `CnJourney :run-id`.

## Usage

```vue
<CnJourneyDialog :journey="journey" :open="open" @close="open = false" @run-started="runId = $event" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `journey` | Object | `{ steps: [] }` | The journey to render (see `CnJourney`). |
| `open` | Boolean | `true` | Whether the dialog is shown. Closing keeps the run. |
| `runId` | String | `''` | A recorded run to resume, for example one started in a page. |
| `endpoint` | String | `''` | Run API base. Empty: OpenRegister's journey-run API. |
| `submitLabel` | String | `''` | Label of the final Submit button. Empty: "Submit". |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | none | The dialog was dismissed. Answers already saved stay on the run. |
| `run-started` | run id | The first step was saved and the run exists. |
| `step` | `{ from, to }` | The journey moved to another step. |
| `submitted` | object | The run was submitted; the server's result. |

## Slots

None.

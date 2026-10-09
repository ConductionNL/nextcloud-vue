# CnJourney

The one in-page renderer for an OpenRegister `journey`. It composes `CnFormPage` for each form step and adds the progress indicator (`CnProcessSteps`), branching, a review step, submit and resume. `CnJourneyDialog` renders the same journey in a modal. Both load on demand, so a page that shows no journey does not download them.

## Usage

```vue
<CnJourney :journey="journey" :run-id="$route.query.run" @run-started="keepRun" @submitted="done" />
```

A journey is `{ id, title, steps[], successMessage? }`:

- A step is `{ id, title, type }`. `type` is `form` (with `form: { fields, steps? }`, rendered by `CnFormPage` with the config unchanged) or `review`.
- A step with its own `steps[]` is a group, one level deep. A third level is reported as an error and not rendered. `navigable: false` makes the group a heading only.
- A step or sub-step may have a `condition` (a `visibleWhen` condition over the answers so far). When it is false the step is not shown or reachable and the rest are renumbered.
- A step may have `branch: [{ when, goto }]`. The first rule that holds decides the next step; a rule that cannot be evaluated is false, the default step is used and the failure is recorded on the run.
- Conditions and branch rules are evaluated by the shared `visibleWhen` evaluator (local, endpoint and source modes) and nothing else.

Answers are saved to the run as each step completes through the run store (`createJourneyRunStore`), so a run resumes at the recorded step with its answers, in a page or a dialog. A host provides mount, chrome and theme only; it does not add step types, field types, validation rules or branch operators (`npm run check:journey-vocabulary`).

On the review step a list answer (an array of objects) shows through `CnJourneyReviewList`. When a later write repeats over it (`forEach`, `targetBy`, `targets`) each item shows what it will be filed as, and Submit stays disabled, with the reason, while an item cannot be filed. Change returns to the step with the values kept and focus on that item.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `journey` | Object | `{ steps: [] }` | The journey to render. |
| `runId` | String | `''` | A recorded run to resume. Empty: a run starts on the first completed step. |
| `store` | Object | `null` | A run store shared with another host (the dialog does this). Empty: one is created. |
| `endpoint` | String | `''` | Run API base for the created store. Empty: OpenRegister's journey-run API. |
| `submitLabel` | String | `''` | Label of the final Submit button. Empty: "Submit". |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `run-started` | run id | The first step was saved and the run exists. Keep the id to resume elsewhere. |
| `step` | `{ from, to }` | The journey moved to another step. |
| `submitted` | object | The run was submitted; the server's result. |

## Slots

None.

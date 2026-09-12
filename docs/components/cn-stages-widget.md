# CnStagesWidget

The stages a record moves through, as a placeable widget. Clicking a stage moves the record there.

Registered in the widget catalog under the `stages` type, on the **detail-page** surface only, and configured by [`CnStagesWidgetForm`](./cn-stages-widget-form.md). It draws the strip with [`CnTimelineStages`](./cn-timeline-stages.md), reads the current stage off the bound record, and moves the record through OpenRegister's lifecycle when a reachable stage is clicked. Nothing about the record type is hard-coded, so a case, a request and a deal all use the same widget with different config.

It is the same contract [`CnLifecycleActions`](./cn-lifecycle-actions.md) speaks, rendered differently. That component draws the allowed moves as buttons, this one draws them as a timeline. Both go through the same shared code, so there is one place that knows what a transition is.

This replaces the hand-written transition strip an app used to ship as its own component. A hand-written strip cannot be moved, resized or removed by the person who owns the page, and it has to be rewritten in every app that wants one.

## Content shape

```json
{
  "currentField": "status",
  "stagesEndpoint": {
    "url": "/apps/myapp/api/case-types/@object.caseType/blueprint",
    "path": "statusTypes",
    "orderField": "order",
    "finalField": "isFinal"
  },
  "transition": { "kind": "lifecycle" },
  "unreachableReason": "Not possible from the current stage"
}
```

## The stage list

The lifecycle says what is reachable **now**. It does not say what the whole process looks like, and a timeline that only showed the next step would not be a timeline. So the list of stages is configured, and it is display only: it grants nothing.

Configure exactly one of two sources.

`stagesEndpoint` reads an app endpoint: `{ url, method?, path, params?, idField?, labelField?, descriptionField?, orderField?, finalField? }`. The url and the params take the shared token grammar (`@objectId`, `@object.<field>`), so `/apps/myapp/api/types/@object.type/stages` names the record's own type. `path` points at the array in the response, and `method` is `GET` unless the endpoint wants otherwise.

`stagesSource` reads an OpenRegister query instead: `{ register, schema, filter?, orderBy?, idField?, labelField?, descriptionField?, finalField?, limit? }`. The filter takes the same tokens.

`idField` names the property holding each stage's id, for a row that does not carry `id`, `@self.id` or `uuid`. `finalField` marks the stages that close the record, which the timeline draws differently. Neither grants anything.

The read goes through the shared [`useEndpointSource`](../utilities/composables/use-endpoint-source.md) engine, so two widgets reading one endpoint issue one request, and both refetch on `cn:page:refresh`.

## Which stages can be reached

`GET /apps/openregister/api/objects/{id}/available-actions`, the same endpoint `CnLifecycleActions` reads. It answers `{ actions: [{ action, to, requires, description, inputs? }] }` already filtered to the record's current state, so a stage is reachable exactly when an action leads to it.

That is the whole guard, and it is why there is nothing here to configure. There is no `allowed` flag to read, no field mapping to get backwards, and no config that can remove the guard: a stage no action reaches is disabled because nothing said it was reachable. It fails closed by construction rather than by a check somebody has to remember to write.

`description` and `requires` from a reachable action become the note beside the stage, so the person can see what the move does before making it. Neither is a gate: OpenRegister has already filtered the list, and it re-validates the move.

A stage no action reaches carries screen-reader text saying so. `unreachableReason` replaces the default wording when an app has better words for its own process.

## Moving the record

`POST /apps/openregister/api/objects/{id}/transition` with `{ action }`, or `{ action, data }` when the action declares `inputs: [{ field, required }]`, mirroring `x-openregister-lifecycle.transitions.<action>.inputs`.

An action with inputs opens the shared [`CnTransitionInputDialog`](./cn-transition-input-dialog.md) first, and cancelling it sends nothing. The confirm button waits until every required field is filled. Pass the record's `schema` to render each declared field with its own title and type instead of a bare text box.

OpenRegister re-validates the move, and a 403 or 422 is shown where the click happened, in its own words.

After a successful move the widget shows the new stage at once, fires `cn:page:refresh` so the page re-reads the record, and re-reads the allowed actions for the stage the record is now on. It also emits `moved` with `{ stage, action }`.

### The three modes

`transition` selects what a click does.

**Absent.** Read only. The stages render, nothing is clickable, and no actions are read.

**`{ kind: 'lifecycle' }`**, the registry default. The contract above.

**`{ kind: 'field' }`**, an explicit opt-in for a record whose schema declares no lifecycle. It writes `currentField` on the record through the object store, sending the stage change and the record's own properties. Nothing validates this path, so every stage is offered and whatever the timeline shows is what happens. That is why it is not the default.

A `kind` the widget does not know reads as read only, so a typo cannot silently select a mode nobody asked for.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The widget config: `currentField`, `stagesEndpoint` or `stagesSource`, `transition`, `unreachableReason`, `orientation`, `size` and `ariaLabel`. `ariaLabel` falls back to `label`, then to "Stages", so a titled placement names its own strip without repeating the title. |
| `objectData` | `object\|null` | `null` | The bound record, when the surface passes it. Falls back to the detail page's injected object context. |
| `objectId` | `string\|number` | `''` | The bound record's id, when the surface passes it. Falls back to the injected object context. |
| `objectType` | `string` | `''` | The object-store type slug of the bound record, used by the `field` transition. Falls back to the context, then to the register and schema of the page. |
| `store` | `object\|null` | `null` | The object store to save through on the `field` opt-in. Falls back to the context's store, then to the shared `useObjectStore()`. |
| `schema` | `object\|null` | `null` | The record's JSON Schema, forwarded to the transition input dialog so declared inputs render with their own title and type. |
| `translate` | `function` | `null` | Translate function for the manifest-authored strings. Falls back to the injected `cnTranslate`, an identity function by default. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `moved` | `{ stage, action }` | The record moved to another stage. |

## Notes

- Nothing is clickable before the allowed actions have been read. "Not read yet" and "no move allowed" are different states, and collapsing them would leave the strip clickable for the length of one request.
- The strip stays blocked from a move until the fresh action list arrives, because until then the list in hand describes the stage the record has just left.
- The current stage carries `aria-current="step"` and nothing else. It is not a move, and it is not blocked either, so it is not announced as blocked. Clicking it does nothing, which stops a stray click re-firing the move that just landed.
- A move in flight keeps every stage's focus stop and marks the stages disabled. Taking the stops away would drop a keyboard user's focus to the page body with nothing to restore it to.
- A re-read record is authoritative whatever it says, so a call the server accepted without moving anything does not leave the strip claiming a stage.
- On the `field` opt-in the save carries the record's own properties, minus the `@self` envelope and minus anything holding `null`, `{}` or `[]`, which OpenRegister refuses on an object property. A record with no id at all is refused rather than saved, because the save would create a duplicate instead of updating it.
- The strip carries `role="list"` with `ariaLabel` as its name, so a screen reader announces what the stages belong to.

Next: configure a placement with [`CnStagesWidgetForm`](./cn-stages-widget-form.md), or put the same moves in a button row with [`CnLifecycleActions`](./cn-lifecycle-actions.md).

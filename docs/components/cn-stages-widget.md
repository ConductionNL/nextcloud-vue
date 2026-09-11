# CnStagesWidget

The stages a record moves through, as a placeable widget. Clicking a stage moves the record there.

Registered in the widget catalog under the `stages` type, on the **detail-page** surface only, and configured by [`CnStagesWidgetForm`](./cn-stages-widget-form.md). It draws the strip with [`CnTimelineStages`](./cn-timeline-stages.md), reads the current stage off the bound record, and performs the configured transition when a reachable stage is clicked. Nothing about the record type is hard-coded, so a case, a request and a deal all use the same widget with different config.

This replaces the hand-written transition strip an app used to ship as its own component. A hand-written strip cannot be moved, resized or removed by the person who owns the page, and it has to be rewritten in every app that wants one.

## Content shape

```json
{
  "currentField": "status",
  "stagesEndpoint": {
    "url": "/apps/myapp/api/case-types/@object.caseType/blueprint",
    "path": "statusTypes",
    "orderField": "order",
    "finalField": "isFinal",
    "resultsPath": "resultTypes"
  },
  "availability": {
    "url": "/apps/myapp/api/case/@objectId/available-transitions",
    "path": "transitions",
    "stageField": "toStatus",
    "moveField": "id",
    "allowedField": "guardsPassed",
    "reasonField": "failedGuards.0.failureMessage"
  },
  "transition": {
    "kind": "endpoint",
    "url": "/apps/myapp/api/case/@objectId/transition",
    "bodyKey": "transitionId",
    "resultKey": "resultTypeId"
  }
}
```

## The stage list

Configure exactly one of two sources.

`stagesEndpoint` reads an app endpoint: `{ url, method?, path, params?, idField?, labelField?, descriptionField?, orderField?, finalField?, resultsPath?, resultIdField?, resultLabelField? }`. The url and the params take the shared token grammar (`@objectId`, `@object.<field>`), so `/apps/myapp/api/types/@object.type/stages` names the record's own type. `path` points at the array in the response, and `method` is `GET` unless the endpoint wants otherwise.

`stagesSource` reads an OpenRegister query instead: `{ register, schema, filter?, orderBy?, idField?, labelField?, descriptionField?, finalField?, limit? }`. The filter takes the same tokens.

`idField` names the property holding each stage's id, for a row that does not carry `id`, `@self.id` or `uuid`. `resultIdField` and `resultLabelField` do the same for the result rows at `resultsPath`.

`finalField` marks the stages that close the record. A move into one asks for a result when results are on offer, either through `resultsPath` in the stages response or through the move's own options.

Both reads go through the shared [`useEndpointSource`](../utilities/composables/use-endpoint-source.md) engine, so two widgets reading one endpoint issue one request, and both refetch on `cn:page:refresh`.

## Moving the record

`transition` is one of two kinds.

`{ kind: 'field' }` saves the bound record with `currentField` set to the clicked stage id, through the same object store the other detail widgets write with. Use it when the stage is a property and nothing else has to happen.

`{ kind: 'endpoint', url, method?, bodyKey?, commentKey?, resultKey?, body?, errorField? }` sends the move to an app endpoint. The body carries the move id under `bodyKey` (`stage` by default), plus the comment and the result when the person gave one. Use it when the app runs guards, writes an audit line or fires a flow on the move.

After a successful move the widget shows the new stage at once and fires `cn:page:refresh`, so the page re-reads the record and every endpoint widget refetches, the availability answer included. It also emits `moved` with `{ stage, move }`.

## Guards

`availability` names an endpoint that says which stages can be reached from here, why the others cannot, and what a move needs: `{ url, method?, path, params?, stageField?, moveField?, allowedField?, reasonField?, commentField?, resultField?, resultOptionsField?, resultIdField?, resultLabelField?, unlistedReason? }`. `method` and `params` behave as they do on `stagesEndpoint`, tokens included.

A blocked stage renders disabled with its reason on screen, because the reason tells the person what the record still needs. A stage the answer does not list renders disabled too, with `unlistedReason` as screen-reader text. A disabled stage keeps its focus stop and carries `aria-disabled="true"`, so a keyboard reaches it and hears why it is closed.

### What counts as blocked

`allowedField` blocks the move on `false`, `0`, `'0'` and `'false'`. Those four are listed rather than inferred, because a JSON round trip or a database column produces the string where the schema said boolean, and a guard that recognises only the literal `false` fails open on every other shape.

A value the answer does not carry at all means allowed, which is what lets an endpoint that lists only the reachable stages keep working. So does any other value: only the four shapes above close a stage.

### When the strip stays shut

Three states block every move, each of them failing closed.

The availability read failed. A guard that cannot be checked is not a guard that passed.

The `availability` block is present but names no url. A typo in the key is a broken guard, not an absent one, so it blocks rather than quietly opening every stage.

A move has just landed and the fresh answer has not arrived. The map in hand describes the stage the record has left, and clicking it would send a move the server has already closed.

### Asking before moving

`commentField` and `resultField` each read `'required'`, `'optional'` (also `true`) or nothing. A move that declares either opens [`CnStageMoveDialog`](./cn-stage-move-dialog.md) before anything is sent. Required means the confirm button waits for it, and the widget re-checks it where the request is made rather than trusting the button alone. Optional means the dialog offers the field and sends the move without it.

A stage marked final by `finalField` requires a result when results are on offer. If none are, the move is blocked at the stage with that reason, because a dialog with no picker and a confirm that can never be enabled is a dead end.

Set `confirm: 'always'` to ask on every move, with an optional comment, even where the answer declares nothing.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The widget config: `currentField`, `stagesEndpoint` or `stagesSource`, `availability`, `transition`, `confirm` (`'declared'` by default, or `'always'`), `orientation`, `size` and `ariaLabel`. `ariaLabel` falls back to `label`, then to "Stages", so a titled placement names its own strip without repeating the title. |
| `objectData` | `object\|null` | `null` | The bound record, when the surface passes it. Falls back to the detail page's injected object context. |
| `objectId` | `string\|number` | `''` | The bound record's id, when the surface passes it. Falls back to the injected object context. |
| `objectType` | `string` | `''` | The object-store type slug of the bound record, used by the `field` transition. Falls back to the context, then to the register and schema of the page. |
| `store` | `object\|null` | `null` | The object store to save through. Falls back to the context's store, then to the shared `useObjectStore()`. |
| `translate` | `function` | `null` | Translate function for the manifest-authored strings. Falls back to the injected `cnTranslate`, an identity function by default. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `moved` | `{ stage, move }` | The record moved to another stage. |

## Notes

- Without a `transition` the strip is read only. The stages still render, and nothing is clickable.
- The current stage carries `aria-current="step"` and nothing else. It is not a move, and it is not blocked either, so it is not announced as blocked. Clicking it does nothing, which stops a stray click re-firing the move that just landed.
- A move in flight keeps every stage's focus stop and marks the stages disabled. Taking the stops away would drop a keyboard user's focus to the page body with nothing to restore it to.
- A refused move leaves the record on its stage and shows the server's reason. `errorField` names the field to read it from.
- A `field` transition saves the record's own properties, minus the `@self` envelope and minus any property holding `null`, `{}` or `[]`, which OpenRegister refuses on an object property. A record with no id at all is refused rather than saved, because the save would create a duplicate instead of updating it.
- The strip carries `role="list"` with `ariaLabel` as its name, so a screen reader announces what the stages belong to.

Next: configure a placement with [`CnStagesWidgetForm`](./cn-stages-widget-form.md), or put the status beside it as a badge with [`CnStatWidget`](./cn-stat-widget.md).

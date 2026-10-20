# CnDecisionListWidget

The `decision-list` built-in widget: a worklist where each row takes one answer from a closed set, a reason, and any fields that answer needs, recorded per row. Board DqMijnWerk draws it as the archival reviews card: destroy, retain or transfer, why, and a new disposal date when retained. hermiq approvals, learniq review queues and integriq approvals use the same widget.

- A row leaves the list once its answer lands, so the user keeps their place.
- A failed read shows an error with a retry, never an empty list: "nothing to decide" and "could not read" are different answers.
- A refusal stays on its row, in the server's own words.

## Usage

```json
{
  "id": "archival-reviews",
  "widgetKey": "decision-list",
  "title": "Archival reviews",
  "props": {
    "content": {
      "source": { "url": "/apps/openregister/api/archival/reviews/pending" },
      "itemsPath": "results",
      "idField": "entryId",
      "title": "{title}",
      "meta": "Disposal date: {archiefactiedatum}",
      "answers": [
        { "value": "destroy", "label": "Destroy" },
        { "value": "retain", "label": "Retain", "fields": [{ "field": "newArchiefactiedatum", "type": "date", "label": "New disposal date" }] },
        { "value": "transfer", "label": "Transfer" }
      ],
      "reason": { "label": "Why?" },
      "submit": { "request": { "url": "/apps/openregister/api/archival/destruction-lists/{listId}/entries/{entryId}/decision" } },
      "emptyText": "You hold no archival decisions right now."
    }
  }
}
```

Recording a retain posts `{ answer: "retain", reason, newArchiefactiedatum: "2031-01-15" }` to that row's url.

## Content

| Key | Description |
|-----|-------------|
| `source` | An endpointSource for the rows (its `responsePath` plucks them) |
| `itemsPath` | A path to the rows inside the response, when `responsePath` is not used |
| `idField` | The row id's path (default `id`) |
| `title`, `meta` | Templates filled from a row, through the app's translate |
| `answers` | `[{ value, label, fields? }]`; `fields` are `[{ field, type?: "date" \| "text", label?, required? }]` that answer asks for, required by default |
| `answerField` | The key the answer is sent as (default `answer`) |
| `answerLabel` | The answer field's label (default "Your answer") |
| `reason` | `{ label?, required?, field? }`, required by default and sent as `field` (default `reason`); `false` drops it |
| `submit` | `{ label?, request: { method?, url, body? } }`; `url` and `body` are templates filled from the row |
| `emptyText`, `errorTitle` | Texts for an empty list and a failed read |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The configuration above |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `decided` | `{ id, item, body }` | A row's decision landed |

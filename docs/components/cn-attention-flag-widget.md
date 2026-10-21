# CnAttentionFlagWidget

A flag a person raises on a record, with a reason, beside the markers the system raised against a part of the record and an assessment the organisation made. Registered under the `attention-flag` widget type for detail pages.

The three are different facts and the widget keeps them apart. A colleague's judgement must not read like a failed virus scan.

## Content shape

```json
{
  "id": "item-attention",
  "type": "attention-flag",
  "content": {
    "endpoint": "/apps/myapp/api/item/@objectId/attention",
    "raisePath": "/raise",
    "clearPath": "/clear",
    "markersPath": "attentionMarkers",
    "panelLabels": { "item-files": "Files", "item-notes": "Notes" },
    "assessment": {
      "path": "riskAssessment",
      "levelMap": { "low": "Low", "high": "High" },
      "reviewDateField": "reviewDate"
    },
    "labels": { "reasonRaise": "Why this item needs attention" }
  }
}
```

| Key | Meaning |
|---|---|
| `endpoint` | The flag's endpoint. `@objectId` and `@object.<field>` are filled in. A GET answers `{ raised, flag: { reason }, history: [{ act, reason, moment }] }`. |
| `raisePath`, `clearPath` | Appended to `endpoint` for the POST of `{ reason }` that raises or clears the flag. Defaults `/raise` and `/clear`. |
| `markersPath` | Where the record holds its markers: `[{ marker, tab, reason }]`. |
| `panelLabels` | What the part a marker points at is called, by its `tab`. A tab without a label shows its id. |
| `assessment` | `{ path, levelMap?, levelField?, groundField?, reviewDateField? }`: the assessment on the record. A review date before today says "Due for review". |
| `labels` | Overrides of the words: `raisedLead`, `assessmentLead`, `reviewDue`, `reasonRaise`, `reasonClear`, `raise`, `clear`, `raised`, `cleared`, `failed`. |

## Behaviour

- A reason is required in both directions. The button stays disabled without one, and the server's refusal (`error` in the answer) shows as written, as an alert.
- An assessment the reader may not see is not on the record, so the widget shows nothing for it rather than an empty line.
- A failed read draws nothing: an instance without the endpoint answers 404, and nothing else depends on it.
- After a raise or a clear the widget emits `object-changed`, tells every list through `dispatchObjectsChanged`, and asks the page to refresh (`cn:page:refresh`).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `Object` | `{}` | The configuration above. |
| `objectId` | `String\|Number` | `''` | The record's id, bound by the detail host. |
| `objectData` | `Object` | `null` | The record, for the markers and the assessment. |
| `register` | `String\|Object` | `''` | The record's register, for the changed-objects signal. |
| `schema` | `String\|Object` | `''` | The record's schema, for the changed-objects signal. |

## Events

| Event | Payload | Description |
|---|---|---|
| `object-changed` | `{ register, schema, id }` | The flag was raised or cleared. |

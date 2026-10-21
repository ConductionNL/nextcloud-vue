# CnStatusExplainerWidget

What the status a record is in asks of it, in sentences. Registered under the `status-explainer` widget type for detail pages.

A status a type derives is not a move anyone can pick. When it has not fired, nothing on the page explains why. Naming the missing document turns that into an errand.

## Content shape

```json
{
  "id": "item-status",
  "type": "status-explainer",
  "content": {
    "endpointSource": { "url": "/apps/myapp/api/item/@objectId/available-transitions" },
    "paths": {
      "derivation": "derivation",
      "withheld": "withheld",
      "waitingOn": "current.waitingOn",
      "dwell": "current.dwell",
      "explanation": "current.statusDescription"
    },
    "fieldRules": true,
    "labels": { "derivationHeading": "This item moves to {status} once these are on file" }
  }
}
```

| Part | Read from | Shows |
|---|---|---|
| `derivation` | `{ name, unmet: [] }` | "This moves to {status} once these are on file", then each missing thing. |
| `explanation` | a string | The explanation an administrator wrote on the status. |
| `withheld` | `[{ id, label, reasons: [] }]` | Each move that waits, with its first reason. An entry without a reason is left out. |
| `waitingOn` | `us`, `applicant` or `thirdParty` | Who the record waits on, when it is not us. |
| `dwell` | `{ days, breached }` | Working days in this status, with a chip when that is longer than the status allows. |
| field rules | the record's `@self.fieldRules` | What the status requires, locks and hides, one line per kind. |

`paths` overrides where each part sits in the answer. `fieldRules: false` leaves the field rules out. `labels.derivationHeading` (with `{status}`) and `labels.fieldRulesHeading` replace the two headings.

## Behaviour

- The widget renders nothing when there is nothing to say.
- A failed read binds nothing from the endpoint. The field rules ride on the record, so they still show.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `Object` | `{}` | The configuration above. |
| `objectId` | `String\|Number` | `''` | The record's id, for the endpoint's tokens. |
| `objectData` | `Object` | `null` | The record, for its field rules. |

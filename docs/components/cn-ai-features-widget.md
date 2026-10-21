# CnAiFeaturesWidget

The hermiq AI features a record's **type** switches on for one surface, on the record itself. For each feature it shows where it runs (hermiq's answer), lets the reader run it on one of the record's documents, and shows a refusal in words. Optional question prompts can be asked about the record. Every suggestion ends in a use / adapt / reject decision that is reported to the AI oversight trail.

## Rules it keeps

- **An undeclared type asks nobody.** The type object's declaration is read first; the features endpoint is called only when something is placed on the surface.
- **Where it runs is hermiq's answer.** A feature hermiq does not offer reads "Unavailable", never "local".
- **A refusal is shown as one**, naming the feature, the reason and hermiq's gate (for example: will not read a document that has not been redacted). A run without a chosen document is refused before any request is sent, because hermiq's redaction gate sits on the document.
- **The run goes to hermiq in the reader's own session**, so their own file access decides what can be read.
- **"Could not read" is not "nothing there".** A failed read says the panel is incomplete.
- **Every shown suggestion ends in exactly one oversight report**: accepted, modified or rejected, or ignored with why (superseded, closed, expired). Without a `decisionEndpoint` nothing is reported.

## Usage

As a sidebar tab, declare the built-in widget type `ai-features`:

```json
{
  "id": "assistant",
  "label": "Assistant",
  "icon": "RobotOutline",
  "widgets": [
    {
      "type": "ai-features",
      "props": {
        "declaration": { "typeField": "kind", "typeSchema": "kind", "field": "aiFeatures", "surface": "record" },
        "featuresEndpoint": "/apps/myapp/api/assistant/ai-features",
        "featuresQueryKey": "kind[aiFeatures]",
        "promptsEndpoint": "/apps/myapp/api/assistant/prompts",
        "askEndpoint": "/apps/myapp/api/assistant/converse",
        "decisionEndpoint": "/apps/myapp/api/ai/record-action",
        "objectKey": "recordId"
      }
    }
  ]
}
```

`objectId`, `register`, `schema` and `apiBase` come from the sidebar.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `objectId` | `String` | `''` | Record id. |
| `register` | `String` | `''` | Register slug or id. |
| `schema` | `String` | `''` | Schema slug or id. |
| `apiBase` | `String` | `/apps/openregister/api` | OpenRegister API root. |
| `declaration` | `Object` | empty | `{ typeField, typeSchema, field, surface }`: the record's `typeField` references a `typeSchema` object (same register) whose `field` (default `aiFeatures`) maps feature slug to surface. The slugs placed on `surface` are shown. |
| `featuresEndpoint` | `String` | `''` | Answers `{ features: [{ slug, available, provider, residency }] }` for `?surface=<surface>&<featuresQueryKey>[<slug>]=<surface>`. Empty: the widget says it could not read the features. |
| `featuresQueryKey` | `String` | `aiFeatures` | Query key the declared slugs are sent under. |
| `filesEndpoint` | `String` | `''` | The record's documents; empty uses `{apiBase}/objects/{register}/{schema}/{objectId}/files`. |
| `runEndpoint` | `String` | `/apps/hermiq/api/ai-features/{slug}/run-on-document` | hermiq's run endpoint. |
| `promptsEndpoint` | `String` | `''` | Answers `{ prompts: [{ id, label, prompt }] }`; empty offers no questions. |
| `askEndpoint` | `String` | `''` | Receives `{ <objectKey>: id, message }` and answers `{ reply, model? }`. |
| `decisionEndpoint` | `String` | `''` | The oversight record-action endpoint; empty reports nothing. |
| `objectKey` | `String` | `objectId` | Body key naming the record in the ask and decision bodies. |
| `title` | `String` | `''` | Heading; empty uses "Assistant". |
| `showTitle` | `Boolean` | `true` | Whether the heading is drawn. |

The document picker is an `NcSelect` with an `inputLabel`. The helpers live in `src/utils/aiFeatures.js` and `src/utils/aiSuggestionTracker.js`.

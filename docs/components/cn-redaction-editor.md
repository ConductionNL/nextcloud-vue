# CnRedactionEditor

Redact a record's documents, one at a time, as board DqLakken draws it. On one side is the document text with the passages marked in place. Beside it is the proposal: a verdict per passage (agreed, adjust, do not redact), a passage the detection missed added by hand, and Record redaction. It names no procedure: the routes and the passage type labels come from `config`, so dossiq's Woo redaction and filinq's anonymisation use the same editor.

- **The check is the reviewer's.** Record redaction is enabled only when every passage has a verdict. It first records the reviewer's check of the passages to redact, and only then asks for the redacted copy.
- **A locked passage** (an entity with `locked: true`, a rule that always applies) starts agreed and cannot be changed. This is how a rule floor sits next to suggestions, for example from an LLM.
- **A refusal is shown** in the server's words, and uploading a version redacted elsewhere stays offered.
- **A recorded document** opens with its passages agreed and is not detected again. Recording refreshes the page and emits `recorded`.

## Usage

```vue
<CnRedactionEditor
  :record-id="caseId"
  :config="{
    urls: {
      list: '/apps/dossiq/api/cases/{recordId}/redactions',
      detect: '/apps/dossiq/api/cases/{recordId}/redactions/{documentRef}/detect',
      check: '/apps/dossiq/api/cases/{recordId}/redactions/{documentRef}/check',
      redact: '/apps/dossiq/api/cases/{recordId}/redactions/{documentRef}/redact',
      upload: '/apps/dossiq/api/cases/{recordId}/redactions/{documentRef}/upload',
    },
    typeLabels: { PERSON: 'Name', BSN: 'Citizen service number', ADDRESS: 'Address' },
    groundsPath: 'weigeringsgronden',
  }">
  <template #crumbs>
    <nav>…</nav>
  </template>
</CnRedactionEditor>
```

## The endpoints

| Url | Request | Answer |
|-----|---------|--------|
| `list` | GET | `{ documents: [{ documentRef, title, redactedDocumentRef?, redaction?: { entities } }] }` |
| `detect` | POST | `{ text, redaction: { entities: [{ type, value, locked? }] } }` |
| `check` | POST `{ entities }` | the passages to redact, as checked |
| `redact` | POST | `{ redactedDocumentRef, redaction }` |
| `upload` | POST, form field `file` | `{ redactedDocumentRef, redaction }`; without `upload` no upload is offered |

`{recordId}` and `{documentRef}` are filled into every url.

## Config

| Key | Description |
|-----|-------------|
| `urls` | The endpoints above |
| `typeLabels` | What a passage type is called, through the app's translate; also the types a hand-added passage can take |
| `groundsPath` | A document's grounds (a list), shown under each passage |
| `title` | The heading; defaults to "Redact: " and the document title |
| `emptyText` | Text when no document needs redacting |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `recordId` | String \| Number | `''` | The record whose documents are redacted, for `{recordId}` |
| `config` | Object | `{}` | The configuration above |
| `breadcrumbs` | Array | `[]` | The trail under the title when no `crumbs` slot is given: `[{ label, fallback?, route? }]`. A label may name record fields (`{identifier}`); `{recordId}` in a route param is the record's id |
| `recordSource` | Object | `null` | Where the record a crumb names is read: `{ register, schema }` |

## As a page

The `redaction` page type mounts the editor as a whole page. Its `config` carries the props:

```json
{
  "id": "ItemRedaction",
  "route": "/items/:id/redact",
  "type": "redaction",
  "title": "Redact documents",
  "config": {
    "recordId": "@route.id",
    "recordSource": { "register": "myapp", "schema": "item" },
    "breadcrumbs": [
      { "label": "All items", "route": { "name": "Items" } },
      { "label": "{identifier}", "fallback": "Item", "route": { "name": "ItemDetail", "params": { "id": "{recordId}" } } },
      { "label": "Redact" }
    ],
    "config": { "urls": { "list": "/apps/myapp/api/items/{recordId}/redactions" } }
  }
}
```

## Slots

| Slot | Description |
|------|-------------|
| `crumbs` | Under the title: a breadcrumb back to the record. Without it, `breadcrumbs` draws one |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `recorded` | `{ documentRef, redactedDocumentRef }` | A redacted copy was recorded |

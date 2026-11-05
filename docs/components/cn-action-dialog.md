# CnActionDialog

The generic dialog for an act on a record: what it is about, whether it is ready, why, and a confirm. One component, configured from the manifest, in place of a hand-built dialog per act. Board DqArchiveren draws the first one: the case, what its case type keeps, a readiness checklist, a reason, a read-only note and **Archive it**.

Every app can open it by name with an `open-modal` action, without registering it: the dialog's configuration goes in the action's `props.config`, the record in `props.objectId` (and `props.object` when the host has it). `"objectId": "@objectId"` resolves against the page's object when the action is dispatched; when nothing could resolve it, the dialog reads the record id from the route's `id`. An app's own registry entry named `CnActionDialog` wins.

## Usage

```json
{
  "id": "archive",
  "label": "Archive",
  "type": "open-modal",
  "target": "CnActionDialog",
  "props": {
    "objectId": "@objectId",
    "config": {
      "title": "Archive this case",
      "subtitle": "The case goes to the archive and is only read afterwards.",
      "summary": { "source": { "url": "/apps/dossiq/api/case/@objectId/summary" }, "title": "{title}", "meta": "{identifier} · {initiatorDisplayName}", "badge": "{resultPublicLabel}" },
      "facts": [{ "title": "Retention under the case type", "items": [{ "label": "Archive nomination", "value": "{archiveNomination}" }, { "label": "Destruction date", "value": "{archiveActionDate}" }] }],
      "checklist": {
        "title": "Ready to archive",
        "source": { "url": "/apps/dossiq/api/case/@objectId/archive/readiness" },
        "itemsPath": "checklist",
        "labels": { "ended": { "label": "Case ended", "unmetDetail": "Finish or abort the case first" }, "documents": { "label": "Documents final", "detail": "{count} of {total} final" } },
        "required": ["ended"]
      },
      "permission": { "source": { "url": "/apps/dossiq/api/case/@objectId/acts" }, "allowedPath": "archive.allowed", "reasonPath": "archive.reason" },
      "reason": { "label": "Reason", "hint": "Goes into the history of the case." },
      "note": { "variant": "info", "title": "Read only afterwards", "text": "Once archived, the case can no longer be changed." },
      "confirm": { "label": "Archive it", "icon": "ArchiveOutline", "request": { "method": "POST", "url": "/apps/dossiq/api/case/@objectId/archive" } },
      "doneText": "The case is archived."
    }
  }
}
```

## The configuration

| Key | Description |
|-----|-------------|
| `title`, `subtitle`, `doneText` | Texts, through the app's translate. `doneText` replaces the body once the act ran. |
| `eyebrow` | The line above the title, a template filled from the record once it is read (`Close off · {identifier}`). |
| `summary` | `{ source?, title, meta?, badge?, icon? }`: the record in one row. The templates fill from the record, read from `source` (an endpoint source) or the `object` prop. |
| `facts` | `[{ title?, items: [{ label, value }] }]`: groups of facts about the record; a `value` template that fills to nothing reads "Not set". |
| `checklist` | `{ title?, source, itemsPath?, labels?, required? }`: items `{ id, met, label?, detail? }` read from `source` (at `itemsPath`). `labels[id]` names an item (`label`, `detail`, `unmetDetail`, templates filled from the item). `met: null` reads "Could not be read". The ids in `required` must be met before the act can run; the rest inform. |
| `permission` | `{ source, listPath?, match?, allowedPath, reasonPath? }`: the act runs only while `allowedPath` reads `true`; `reasonPath` says why not. With `listPath`, both paths read the entry of that list whose fields equal `match`, for an endpoint that answers a list of acts (`{ listPath: 'acts', match: { act: 'archive' } }`). |
| `fields` | `[{ field, type?, label?, required?, options?, hint?, placeholder?, default?, valuePath?, storedPath?, source?, optionLabel?, optionSecondary?, excludeSelf? }]`: inputs the act asks for, sent beside the reason under their `field`. `type` is `text` (default), `date`, `datetime`, `select`, `secret`, `checkbox`, `search`, `checks` or `cards`; each is required unless `required: false`. `valuePath` starts the field from the record, so the dialog can edit one. A `secret` is a password input that never shows a stored value: while `storedPath` reads true on the record it says a value is stored, it is not required, and it is sent only when something was typed (a PIN the server hashes). A select's `options` are `[{ value, label, fills? }]`, and choosing one sets the fields in `fills` that are still empty (a template that suggests a title). A `checkbox` is a tinted box whose `label` and `hint` are filled from the record (`"Let {initiatorDisplayName} know"`); it starts at `default` (false), is sent as a boolean, and is optional unless `required: true`, which means it must be ticked. A `search` field ("Zaak koppelen") finds records of `source: { register, schema }` as the reader types, shows each as `optionLabel` with `optionSecondary` under it (templates on the found record, default `{title}`), leaves the record in hand out with `excludeSelf: true`, and sends the chosen record's id. A `checks` field ("Documenten die meegaan") ticks several items, listed in `options` or read off the record at `itemsPath`; `optionValue` (default `value`, else the item's `id`), `optionLabel` and `optionSecondary` (templates on the item) name their parts. It starts on `default`, a list or `"all"`, sends the ticked values as a list, and required means at least one; `emptyText` says when there is nothing to tick. A `cards` field ("Delen" or "Overdragen") is one choice out of `options` `[{ value, label, description? }]` drawn with `CnChoiceCards`, starting on `default`. Every field's `label`, `hint` and `placeholder` are templates filled from the record. |
| `reason` | `{ label?, hint?, required?, field? }`: a text area, required unless `required: false`, sent as `field` (default `reason`). |
| `note` | `{ variant?, title?, text, icon? }`: a read-only note (`info`, `warning`, `error`, `success`); `icon` an icon name in place of the variant's own (`LockOutline`). |
| `confirm` | `{ label, icon?, request?, action? }`: `request` (`{ method?, url, body?, answerPath? }`) is sent by the dialog, `body` templates filled from the record and `{reason}`, and `answerPath` shows the text at that path of the answer once the act ran, in place of `doneText`, for a lookup that says what it found; else `action`, a manifest action, is dispatched through the page with the field values and `reason` as its last argument. |

| `source` | An endpoint source the record is read from, beside or in place of `summary.source`: a policy that a field's `visibleWhen` reads (`{ path: 'allowed', includes: 'documents' }`). |
| `requireOneOf` | Names of sent values of which at least one must hold something (a split that moves documents, parties, or both). |

Every url takes `@objectId` and `@object.<field>`. After the act the page refreshes (`cn:page:refresh`).

## Acts, conditional fields and options from an endpoint

One dialog can offer two acts that post to different endpoints, show a field for one act only, read its options from the server, and send "ticked means shared" as the list of what is left out.

```json
{
  "fields": [
    { "field": "mode", "type": "cards", "default": "share", "options": [{ "value": "share", "label": "Share" }, { "value": "handover", "label": "Hand over" }] },
    { "field": "organisation", "type": "select", "label": "Organisation",
      "optionsSource": { "url": "/apps/openregister/api/organisations/search", "params": { "_limit": 100 }, "responsePath": "organisations", "match": { "type": "partner" }, "errorText": "The organisations could not be read." },
      "optionLabel": ["{name} ({domain})", "{name}"] },
    { "field": "permission", "type": "select", "default": "read", "visibleWhen": { "field": "mode", "equals": "share" }, "options": [{ "value": "read", "label": "Read only" }] },
    { "field": "limit", "type": "checkbox", "label": "Share only some fields", "visibleWhen": { "field": "mode", "equals": "share" } },
    { "field": "shared", "type": "checks", "label": "Fields they see", "default": "all", "sendUnticked": true, "sendAs": "fieldExclusions",
      "visibleWhen": { "field": "limit", "equals": true }, "options": [{ "value": "title", "label": "Title" }, { "value": "status", "label": "Status" }] }
  ],
  "note": { "textsBy": { "field": "mode", "cases": { "share": "You see what they do on the record.", "handover": "They become the owner once they accept." } } },
  "confirm": {
    "requestsBy": { "field": "mode", "cases": {
      "share": { "url": "/apps/example/api/shares", "label": "Share", "icon": "Send", "body": { "recordId": "{id}", "partnerId": "{fields.organisation}" } },
      "handover": { "url": "/apps/example/api/transfers", "label": "Hand over", "fieldsInBody": false, "body": { "recordId": "{id}", "targetOrganization": "{fields.organisation}" } }
    } }
  }
}
```

- `visibleWhen` on a field or the note: `{ field }` reads another field's value, `{ path }` a value of the record; then `equals`, `in` (a list), `includes` (the value is a list holding it) or `filled` (`true` by default). A hidden field is not drawn, not required and not sent, and a field that depends on a hidden field is hidden too.
- `optionsSource` on a `select` or `checks` field: an endpoint source (`url`, `params`, `responsePath`). `match` keeps the entries whose fields equal it. `optionValue` (default `id` for a select) and `optionLabel` (a template, or a list of templates of which the first that fills wins) name each option. `search: true` reads again as the reader types, the term under `searchParam` (default `_search`). A failed read shows `errorText` (default "The options could not be read.") rather than an empty list. A select also takes `default`.
- `sendUnticked: true` on a `checks` field sends the items left unticked; `sendAs` on any field sends its value under another key.
- `confirm.requestsBy: { field, cases }` posts the request the chosen value names (`url`, `method`, `body`, `answerPath`, and the button's `label`, `icon` and `doneText`), else `confirm.request`. In a `body`, `{fields.<key>}` reads a sent value by the key it is sent under (its `sendAs`, else its `field`); a body value that is only that token keeps its type (a list stays a list), and reads `''` while the field is hidden. `fieldsInBody: false` sends the body alone.

### Ticks in columns

A `checks` field with `columns: [{ field, label }]` draws one checkbox per column on every item, sends each column as its own list under its `field`, starts with nothing ticked, and with `exclusive: true` refuses an item ticked in two columns (`exclusiveText`, default "An item cannot be ticked in more than one column."). `hideWhenEmpty: true` hides a `checks` field that has no items.

```json
{
  "source": { "url": "/apps/example/api/records/@objectId/split" },
  "requireOneOf": ["documents", "parties", "partiesOnBoth"],
  "fields": [
    { "field": "title", "label": "What the new record is called" },
    { "field": "documents", "type": "checks", "required": false, "hideWhenEmpty": true, "visibleWhen": { "path": "allowed", "includes": "documents" },
      "optionsSource": { "url": "/apps/openregister/api/objects/example/document", "params": { "record": "@objectId", "_limit": 100 }, "responsePath": "results" }, "optionLabel": ["{title}", "{name}"] },
    { "field": "partyRows", "type": "checks", "required": false, "exclusive": true, "visibleWhen": { "path": "allowed", "includes": "parties" },
      "optionsSource": { "url": "/apps/openregister/api/objects/example/role", "params": { "record": "@objectId" }, "responsePath": "results" },
      "columns": [{ "field": "parties", "label": "Moves" }, { "field": "partiesOnBoth", "label": "On both" }] }
  ],
  "confirm": { "label": "Split", "request": { "url": "/apps/example/api/records/@objectId/split" } }
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | Object | `{}` | The dialog, see above |
| `objectId` | String \| Number | `''` | The record's id, for `@objectId` |
| `object` | Object \| null | `null` | The record, when the host has it |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | none | The dialog was closed |
| `done` | the sent field values and `reason` | The act ran |

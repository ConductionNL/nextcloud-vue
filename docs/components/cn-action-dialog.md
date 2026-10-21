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
| `fields` | `[{ field, type?, label?, required?, options?, hint?, placeholder?, default?, valuePath?, storedPath?, source?, optionLabel?, optionSecondary?, excludeSelf? }]`: inputs the act asks for, sent beside the reason under their `field`. `type` is `text` (default), `date`, `datetime`, `select`, `secret`, `checkbox` or `search`; each is required unless `required: false`. `valuePath` starts the field from the record, so the dialog can edit one. A `secret` is a password input that never shows a stored value: while `storedPath` reads true on the record it says a value is stored, it is not required, and it is sent only when something was typed (a PIN the server hashes). A select's `options` are `[{ value, label, fills? }]`, and choosing one sets the fields in `fills` that are still empty (a template that suggests a title). A `checkbox` is a tinted box whose `label` and `hint` are filled from the record (`"Let {initiatorDisplayName} know"`); it starts at `default` (false), is sent as a boolean, and is optional unless `required: true`, which means it must be ticked. A `search` field ("Zaak koppelen") finds records of `source: { register, schema }` as the reader types, shows each as `optionLabel` with `optionSecondary` under it (templates on the found record, default `{title}`), leaves the record in hand out with `excludeSelf: true`, and sends the chosen record's id. Every field's `label`, `hint` and `placeholder` are templates filled from the record. |
| `reason` | `{ label?, hint?, required?, field? }`: a text area, required unless `required: false`, sent as `field` (default `reason`). |
| `note` | `{ variant?, title?, text }`: a read-only note (`info`, `warning`, `error`, `success`). |
| `confirm` | `{ label, icon?, request?, action? }`: `request` (`{ method?, url, body? }`) is sent by the dialog, `body` templates filled from the record and `{reason}`; else `action`, a manifest action, is dispatched through the page with the field values and `reason` as its last argument. |

Every url takes `@objectId` and `@object.<field>`. After the act the page refreshes (`cn:page:refresh`).

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
| `done` | the field values and `reason` | The act ran |

# CnAssignDialog

Hand a record to another user or team, with a note and optional switches, configured from the manifest. dossiq's case handover (board DqOverdragen) is the first consumer: the new team, why it moves, and whether the applicant is told. pipelinq tickets and bulk reassignment use the same dialog.

It is a built-in modal: any app opens it by name with an `open-modal` action and passes its `config` in the action's `props`, without registering it. An app's own registry entry with the same name wins.

## Usage

```json
{
  "type": "open-modal",
  "target": "CnAssignDialog",
  "props": {
    "objectId": "@objectId",
    "config": {
      "title": "Hand this case to another team",
      "eyebrow": "Hand over · {identifier}",
      "source": { "url": "/apps/dossiq/api/case/@objectId/summary" },
      "assignee": {
        "kinds": ["group"],
        "label": "New team",
        "currentPath": "assignedGroupPublicName",
        "currentHint": "Now with {current}.",
        "hint": "The new team picks its own handler.",
        "allowTyped": true,
        "field": "team"
      },
      "note": { "label": "Why it is moving", "field": "reason" },
      "toggles": [
        { "field": "doorzending", "label": "Tell the applicant, this is a doorzending (Awb 2:3)", "note": "Leave it off for a move inside the organisation." }
      ],
      "confirm": { "label": "Hand it over", "request": { "url": "/apps/dossiq/api/case/@objectId/handover" } },
      "doneText": "The case is with its new team."
    }
  }
}
```

Confirming sends `{ team, reason, doorzending }` to the request url, or dispatches `confirm.action` with that choice as its last argument. The page is then refreshed. A refusal is shown in the server's own words and the dialog stays open.

## Config

| Key | Description |
|-----|-------------|
| `title`, `subtitle`, `doneText` | Texts, through the app's translate |
| `eyebrow` | A template filled from the record |
| `source` | An endpointSource to read the record from; else the `object` prop |
| `assignee.kinds` | `["group"]` (default), `["user"]`, or both |
| `assignee.label`, `placeholder`, `hint` | The field's texts |
| `assignee.currentPath`, `currentHint` | Who has the record now, read from it, and the sentence that says so (`{current}`) |
| `assignee.allowTyped` | Offer what was typed as a choice, for instances where the search answers nothing |
| `assignee.field`, `kindField` | The key the id is sent as (default `assignee`), and the key its kind (`group`/`user`) is sent as |
| `note` | `{ label?, hint?, required?, field? }`, required by default and sent as `field` (default `note`); `false` drops it |
| `toggles` | `[{ field, label, note? }]`: switches that start off and are sent as booleans |
| `confirm` | `{ label?, icon?, request?: { method?, url, body? }, action? }` |

Tokens (`@objectId`, `@object.<field>`) resolve in every url.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | Object | `{}` | The configuration above |
| `objectId` | String \| Number | `''` | The record's id, for the `@objectId` token |
| `object` | Object | `null` | The record, when the host has it |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `done` | the choice as sent | The assignment ran |
| `close` | | The dialog was closed |

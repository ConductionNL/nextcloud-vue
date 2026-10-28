# CnEmailLinkDialog

The "Link an existing email" picker on its own: the user picks a Mail message
and it is linked to the record (`POST /objects/{register}/{schema}/{id}/emails`),
as the email tab's "Link existing email" does. A message that is already linked
counts as linked. After a link the dialog announces `cn:timeline:changed` for
the record and closes; a failed link shows an error toast and stays open.

Register it as a modal in the app's registry and open it from a card header
action:

```json
{ "label": "Link email", "variant": "tonal", "action": { "type": "open-modal", "target": "EmailLinkDialog", "props": { "register": "pipelinq", "schema": "client", "objectId": "@objectId" } } }
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `register` | String | (required) | Register slug of the record. |
| `schema` | String | (required) | Schema slug of the record. |
| `objectId` | String | (required) | Id of the record. |
| `apiBase` | String | `'/apps/openregister/api'` | Base URL of the OpenRegister API. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | none | The picker closed, or the message is linked. |

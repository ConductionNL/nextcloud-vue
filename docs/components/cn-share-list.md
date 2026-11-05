# CnShareList

The shares of a record with people outside the organisation, one row per share, as board DqZaakBetrokkenen draws "Delen buiten de organisatie": the kind (case, file, mail), the title, a meta line, a status pill, and the buttons Copy link and Revoke. Widget type `share-list`.

```json
{
  "id": "case-shares",
  "type": "share-list",
  "title": "Sharing outside the organisation",
  "headerActions": [{ "label": "New share", "action": { "type": "open-modal", "target": "CaseShareDialog", "props": { "caseId": "@objectId" } } }],
  "content": {
    "url": "/apps/dossiq/api/cases/{objectId}/shares",
    "revoke": { "url": "/apps/dossiq/api/shares/{id}" },
    "statusLabels": { "active": "Active", "expired": "Expired", "revoked": "Revoked" },
    "copyLabel": "Copy link",
    "revokeLabel": "Revoke"
  }
}
```

## Content

| Key | Default | Meaning |
|-----|---------|---------|
| `url` | | The list endpoint, app-relative, `{objectId}` filled. Answers an array or `{ results: [] }`. |
| `fields` | `{ id: 'id', title: 'title', meta: 'meta', status: 'status', link: 'url', kind: 'kind', revocable: 'revocable' }` | Where each part of a row is read. |
| `statusLabels` | | A label per status value, through the host translate. `active` is green, `pending` amber, the rest neutral. |
| `revoke` | | `{ url, method?, successMessage? }`: `{field}` placeholders from the row, method `DELETE` by default. Without it there is no Revoke button. |
| `copyLabel`, `revokeLabel`, `emptyText`, `listLabel` | Copy link, Revoke, Nothing is shared outside the organisation., Shares | Texts, through the host translate. |

Revoke shows on a share that is not `revoked` and whose `revocable` field is not `false`. It runs as an `api-call` through the page dispatcher with `noticeInline: 'error'`: a refusal shows in the card as an alert in the server's words ([card notices](./cn-card-notices.md)) and the row stays; a revoke that lands reads the list again. Copy link writes the link to the clipboard and says "Link copied" in a polite live region.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | See above. |
| `objectId` | String \| Number | `''` | The record id for `{objectId}` in `url`. |

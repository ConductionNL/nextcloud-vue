# CnExportsWidget

The reader's own exports (board DqZoekresultaten, "Uw exports"): each file with when it was made, how often it was
downloaded and when it expires, a Download button while the file is there, and "Expires today" on its last day.

It reads OpenRegister's export runs (`GET /apps/openregister/api/exports`) with the reader as the actor, so an
administrator sees their own exports here too, newest first. A run whose file was swept, or that never produced one, is
left out. Name it in an index page's `sidePanel`, or anywhere a built-in widget can go, as `type: "exports"`.

```json
{ "id": "exports", "type": "exports", "title": "Your exports", "content": { "register": "dossiq", "schema": "case", "limit": 5 } }
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `Object` | `{}` | `{ register?, schema?, limit?, emptyText? }`. `register` and `schema` narrow the list to one list's exports; `limit` (default 5) is how many show. |

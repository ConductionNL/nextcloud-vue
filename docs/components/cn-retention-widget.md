# CnRetentionWidget

The `retention` detail widget: what happens to a record when its business use ends, as OpenRegister decided it. Every value is read off the record's `@self._retention`: appraisal, disposal date, retention period, selection list row, the rule that decided it and when it was written. It also reads `@self.archived`. The widget derives nothing, so it can never disagree with the stored decision. Any app on OpenRegister uses it; dossiq's case Archiving tab is the first.

- It fails closed: a failed read shows an error with a retry, never an empty archival block.
- A record that nothing could nominate is drawn apart from a record that is not closed yet. The first keeps data past its lawful term; the second is nobody's problem yet.
- When `statusField` is set, a mismatch between the record's own archive field and OpenRegister's `@self.archived` marker is said out loud rather than resolved silently.
- An archivist (a member of `archivistGroups`) or an admin may ask OpenRegister to recompute the nomination, with a reason. Anyone else sees the control disabled, so they learn which role it needs.

## Usage

```json
{
  "id": "archiving",
  "type": "retention",
  "content": {
    "statusField": "archiveStatus",
    "archivedValues": ["archived", "archived_retention_period_unknown"],
    "archivistGroups": ["archivaris"]
  }
}
```

The record is read fresh from `/apps/openregister/api/objects/{register}/{schema}/{id}`, because `_retention` is attached when the object is read. Recomputing posts `{ reason }` to `/apps/openregister/api/archival/objects/{id}/nomination/recompute`.

## Content

| Key | Description |
|-----|-------------|
| `title`, `subtitle` | Texts, through the app's translate (default "Archiving") |
| `statusField` | A record field that also says whether it is archived |
| `archivedValues` | The values of `statusField` that mean archived (default `["archived"]`) |
| `archivistGroups` | Groups that may recompute (default `["archivaris"]`); admins always may |
| `recompute` | `false` hides the recompute control |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The configuration above |
| `objectData` | Object | `null` | The bound record on a detail page; its `@self` gives register, schema and id |
| `register` | String \| Number | `''` | The record's register, overriding the bound record's |
| `schema` | String \| Number \| Object | `''` | The record's schema, overriding the bound record's |
| `objectId` | String \| Number | `''` | The record's id, overriding the bound record's |

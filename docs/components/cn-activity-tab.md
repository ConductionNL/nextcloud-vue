# CnActivityTab

The `activity` integration's sidebar tab, and (as the integration's `widgetExpanded`) its full-size widget on a detail page or a manifest grid. It shows one list of what happened to an object: field changes (the audit trail), NC Activity, attached files, notes and mail, newest first, grouped by day, with the actor, the time and the kind of each row.

It reads OpenRegister's merged activity feed and pages on the feed's time cursor. A server without the merged feed (404, 405 or 501) makes the tab read the single-source Activity endpoint it read before, with its type, actor and date filters; the `legacyFeed` prop selects that on purpose.

- **A chip per kind.** Changes, Activity, Files, Notes and Mail, each with the count the feed returns. A kind with no rows keeps its chip, reading 0: a chip that vanished would say the kind does not exist on this object. A chip narrows the feed to that kind.
- **Reads are off.** Read entries are left out by default. The reader's choice to show them is remembered per user, in their preferences (the `cnUserPreferences` group from `CnAppRoot`), or in the browser without one. Only an audit row can be a read: a note whose action is spelled `read` is still shown.
- **A date range.** From and until, which is what the feed takes. The 24h, 7d and 30d presets fill in From and leave Until open.
- **Export.** Exports the rows on screen as CSV, with the filters that produced them, and re-queries nothing, so the file and the list beside it cannot disagree.

A printed (PDF) feed is not offered. The tab does not check access to the rows either: the read that opened the object decided that.

## The wire

The names the tab sends and reads are in `src/integrations/builtin/activity/activityFeedWire.js`, in one place:

| | |
|--|--|
| Read | `GET {apiBase}/objects/{register}/{schema}/{id}/activity-feed?limit&kinds&from&until&reads&actor&visibility&cursor` |
| Response | `{ results, cursor, counts: { <kind>: n } }`, `cursor` null at the end |
| Export | `POST .../activity-feed/export` with `{ rows, filters }`, answering CSV |

These names are what the feed's contract implies; they have not been measured against OpenRegister yet. When the measured shape differs, change that file.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `integrationId` | String | `'activity'` | Stable integration id, forwarded by the registry. |
| `objectId` | String | required | Parent object id. |
| `register` | String | `''` | OpenRegister register id (slug or uuid). |
| `schema` | String | `''` | OpenRegister schema id (slug or uuid). |
| `apiBase` | String | `/apps/openregister/api` | Base API URL. |
| `pageSize` | Number | `25` | Rows per fetch. |
| `legacyFeed` | Boolean | `false` | Read the single-source NC Activity endpoint (type, actor and date-range filters; no kinds, reads toggle or export) instead of the merged feed. The tab also falls back to it by itself when the server has no merged feed. |
| `showVisibility` | Boolean | `false` | Show a visibility chip on each row and a visibility filter. |
| `publicViewOnly` | Boolean | `false` | The caller is served the public view only: the visibility filter is fixed at public, with the reason. |
| `emptyLabel` | String | "No activity yet for this object" | Pre-translated empty-state label. |
| `unavailableLabel` | String | "NC Activity is currently unavailable." | Pre-translated unavailable banner. |
| `loadMoreLabel` | String | "Load more" | Pre-translated load-more button label. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `exported` | Number | The feed on screen was exported; the number of rows. |

## Slots

None.

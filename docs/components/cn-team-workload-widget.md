# CnTeamWorkloadWidget

The team today: each person with their initials, name, an availability line, their open count and a load bar, under a header note that says how many are present ("4 of 5 present"). Board DqTeamwachtrij draws it as "Team vandaag"; every app with a work queue can place it. Registered under the `team-workload` type; place it from the manifest (there is no config form yet), on a dashboard or in an index page's side panel.

The counts come from the app: `source` names an endpoint that answers one row per person. The availability comes from Nextcloud's user status, read on the client through the OCS user status API, so no app needs a server helper for it:

- a status message reads as the person wrote it, with the time it ends: "In a meeting until 14:00";
- otherwise the status: Available (online), Away, Busy (do not disturb);
- without a status the person reads as Absent today.

Present means any status but offline. The viewer comes first, marked "(you)", the others by name. A bar is full at `capacity` open items (else at the highest count) and turns red from 90 percent.

## Manifest

```json
{
  "id": "team-today",
  "type": "team-workload",
  "title": "Team today",
  "content": {
    "source": {
      "url": "/apps/dossiq/api/work-queue/workload",
      "responsePath": "handlers",
      "userField": "handler",
      "nameField": "displayName",
      "countField": "openCaseCount"
    },
    "capacity": 12,
    "countLabel": { "one": "{count} case", "other": "{count} cases" }
  }
}
```

## Content

| Key | Description |
|---|---|
| `source` | `{ url, responsePath?, userField?, nameField?, countField? }`. The url goes through `generateUrl` and is read with the viewer's session. The rows are read at `responsePath` (else the body), each with the user id at `userField` (default `userId`), the name at `nameField` (default `displayName`) and the open count at `countField` (default `count`). |
| `capacity` | The count at a full bar. Without it the highest count is. |
| `countLabel` | `{ one, other }` with `{count}`, through the app's translate. Without it the count reads "{count} open". |
| `emptyText` | Shown without anyone to list, through the app's translate. |
| `hideWhenEmpty` | Render nothing at all when there is no one to list, including when the read is refused (a 403 for someone who is not a coordinator). Default `false`. |
| `rowRoute` | Makes each person's row a button that opens their work. A route name is given the person as `query[rowRouteParam]`; a route location (`{ name, params?, query? }`) has `{user}` in its values replaced by the person's user id. |
| `rowRouteParam` | The query key a route-name `rowRoute` receives the user id under. Default `assignee`. |

The header note is reported through the `header` event, which the dashboard card and the index page's side panel draw in the card's title row.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The source, capacity and labels (see above). |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnTeamWorkloadWidget.md'

<GeneratedRef />

# CnWorkspaceFilterWidget

A dashboard **choice list** (radio-list or select) that writes the selected
value into the page **workspace context**, so sibling widgets whose
declarative sources interpolate `@workspace.<key>` re-resolve their tokens
and refetch (#91 Wave 3 — the `workspace-filter` widget).

Registered as the `workspace-filter` dashboard widget type; resolved by its
type key via `CnDashboardPage`'s widget dispatcher. Not a public import —
place it declaratively with `type: "workspace-filter"`.

## How it drives siblings

`CnDashboardPage` provides a reactive `cnWorkspaceContext` bag. This widget
writes the chosen value under the key named by `writes`
(`"@workspace.queue"` → the bare key `queue`). Any sibling widget on the
page — an `object-table` with `filter: { queue: "@workspace.queue" }`, a
`stat` whose endpoint URL interpolates `@workspace.queue`, a `chart`
aggregate filter — re-resolves its `@workspace.*` tokens and refetches when
the selection changes. This is the pipelinq **WerkplekQueueFilter**
contract: pick a queue, every work-list widget follows.

An optional leading **"All"** option (`allLabel`) writes the empty string,
so an *optional* sibling token (`@workspace.queue?`) drops and the siblings
show the unfiltered set.

## Options — three sources

| Config | Behaviour |
|--------|-----------|
| `options[]` | Static list — each `{ value, label, count? }` (or `{ id, name }` / bare strings, normalised). |
| `source` | `{ register, schema, groupBy, filter? }` — OpenRegister's `/grouped` facet: each distinct value becomes an option with its object `count`. |
| `endpointSource` | `{ url, params?, responsePath? }` — an app endpoint returning an array of options. |

## Config

```jsonc
{
  "widgetKey": "workspace-filter",
  "content": {
    "label": "Queue",
    "writes": "@workspace.queue",   // the workspace key to write
    "style": "radio",                // "radio" (default) | "select"
    "allLabel": "All",               // optional clear affordance
    "showCounts": true,
    "source": { "register": "pipelinq", "schema": "werkitem", "groupBy": "queue" }
    // or: "options": [{ "value": "inbox", "label": "Inbox", "count": 3 }]
    // or: "endpointSource": { "url": "/apps/pipelinq/api/queues" }
  }
}
```

Selection precedence on mount: an existing workspace value → `content.default`
→ (when no `allLabel`) the first option, so siblings always have a value to
filter on.

## Start card and object picker

A dashboard often opens with a "start" card: a title and one line of guidance on the left, the control that puts something in focus on the right (PqDashboard's "Contact starten"). Declare it on the same widget:

```json
{
  "id": "contact-start",
  "type": "workspace-filter",
  "showTitle": false,
  "content": {
    "layout": "start",
    "title": "Contact starten",
    "description": "Zoek de klant aan de lijn of aan de balie.",
    "writes": "@workspace.selectedClient",
    "objectSource": { "register": "pipelinq", "schema": "client", "labelField": "name", "placeholder": "Naam, telefoon, e-mail, postcode of klantnummer" },
    "link": { "label": "Bekijk een voorbeeld", "route": { "name": "Help" } }
  }
}
```

| Key | Meaning |
|-----|---------|
| `layout` | `"start"`: `title` and `description` left, the control and `link` right; they wrap below each other on a narrow cell. |
| `title`, `description` | The card's heading (17px, bold) and guidance line (muted, at most 420px wide). Translated through `cnTranslate`. |
| `objectSource` | `{ register, schema, labelField?, placeholder?, ariaLabel?, preload? }`: the control becomes an OpenRegister object picker (`CnResourceSelect`) that searches on the server, so it reaches every object and not only a fetched page, and writes the picked object's id. With no selection, no `default` and no `allLabel` it selects the first object the source lists (one `_limit=1` read), so the page always has one in focus. Its accessible name is `ariaLabel`, else the title. |
| `link` | `{ label, route? }` or `{ label, href? }`, drawn after the control. |

`objectSource` wins over `options`, `source` and `endpointSource`. Without these keys the widget renders exactly as before.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `{ key, value }` | Emitted after a selection (in addition to the workspace-context write). |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnWorkspaceFilterWidget.md'

<GeneratedRef />

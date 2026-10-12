import GeneratedRef from './_generated/CnSavedViewsWidget.md'

# CnSavedViewsWidget

The reader's own saved views as a list of links, the "Opgeslagen weergaven" card of a board dashboard. Registered under the `saved-views` widget type.

[`saved-view`](./cn-saved-view-widget.md) draws the rows of ONE view that the manifest names by id. This widget lists the views themselves and has no id to configure, so a view the user saves later shows up without a manifest change. It asks the Views API for the signed-in user's views, keeps those that belong to the configured source, and links each to the index page's route with the view's filters, search and sort in the query, which the index page applies on load.

## Content shape

```json
{
  "type": "saved-views",
  "title": "Opgeslagen weergaven",
  "content": {
    "register": "pipelinq",
    "schema": "ticket",
    "route": "Tickets",
    "showCounts": true,
    "limit": 10,
    "emptyText": "Je hebt nog geen opgeslagen weergaven."
  }
}
```

| Key | Meaning |
|-----|---------|
| `register`, `schema` | The source of the index page. A view belongs to it when it was saved there (its `scope`, or the `schemas` and `registers` it names). A view that names neither is shown everywhere. |
| `scope` | The index page's `savedViewsScope`, when the page overrides the default scope. |
| `route` | The name of the index page's route, or a location `{ name, params }`. Each link carries the view's state as its query. Without it the names are plain text. |
| `own` | Default `true`: only the signed-in user's own views. `false` adds the views shared with them. |
| `showCounts` | Adds how many records each view matches, `Van mij, alle statussen (9)`: one list request per view. A view whose count failed shows its name only. |
| `limit` | The most views shown. Default 10. |
| `emptyText`, `errorText` | The lines for no views and for a failed read. |

The list is read on load and on a page refresh. A saved view's own filters are the ones that count, so the count of a view saved with a search term ignores the search.

The `api` prop (`{ fetchViews }`) replaces the Views API transport, for tests and hosts that stub it; by default the widget uses `useSavedViewsApi`.

<GeneratedRef />

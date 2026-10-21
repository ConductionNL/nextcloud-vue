# CnReportsPage

One page that lists every report your app offers, as cards. It is the manifest page type `reports`. Use it in place of a Reports submenu with one entry per report.

An app has one reports page. For other pages of links, use [CnLinkCardsPage](./cn-link-cards-page.md).

## From the manifest

```json
{
  "id": "Reports",
  "route": "/reports",
  "type": "reports",
  "config": {
    "categories": { "operational": "Operational" },
    "cards": [
      { "id": "Throughput", "label": "Processing time", "description": "How long cases take, by type.", "category": "operational", "route": "Doorlooptijd" }
    ]
  }
}
```

A card names a route by name. A card without a route or a label is left out. With more than one category in use, a filter above the cards narrows the list.

### Widgets under the cards

`widgets` and `layout` take the shape a `type: "dashboard"` page takes, and draw as a dashboard grid under the cards. Use them for a report's key figures on the page itself: a card title with a `headerLink` ("Hele rapportage"), stat tiles with a `note` as sub-line, and a chart. Without `layout`, each widget takes a full row. The dashboard is only loaded for a page that declares widgets.

### Buttons beside the title

`headerButtons` puts buttons beside the title, as board DcRapportages draws "Downloaden". Each is `{ label, action, variant?, icon?, id? }`, and `action` is the id of a `headerActions` entry, in the shape an index page uses: a registry `handler`, `navigate` with a `route`, `type: "navigate"` with a `target` URL (a new tab), `emit`, or `none`. Every click also emits `header-action` `{ action, id }`, except for `none`. A button naming an entry with `href` is a real link instead, which runs and emits nothing (see [CnIndexPage](./cn-index-page.md#header-actions-that-are-links-href)). Under the board look the buildiq square sits between the secondary buttons and the primary one. Without `headerButtons` the header is unchanged.

```json
"config": {
  "headerActions": [{ "id": "download", "label": "Download", "handler": "downloadReports" }],
  "headerButtons": [{ "label": "Download", "action": "download", "icon": "Download" }]
}
```

### The board look

Under `look: "board"` (board PqReports) the page draws a 28px title over a muted lead, then:

- category chips with their card counts, after an "All categories" chip; a chip narrows the sections to its category;
- one section per category under a small uppercase caption (cards without a category first, under no caption);
- three cards a row (two, then one, as the column narrows), each with the card's `icon` in a 40px tile (a chart icon
  when it names none), its title, its category, its description, and a footer with the card's `note` ("Opens its own
  page" when absent) and an Open link;
- a side column of at most 300px: the categories with their counts, and a note card;
- the `footnote`, when declared, under the page with an info icon.

```json
"config": {
  "sideNote": { "title": "Missing a report?", "text": "Build one in Nextcloud Analytics, or ask an administrator." },
  "footnote": "Figures are refreshed every night."
}
```

`sideNote` is `{ title, text }`; a missing part takes the library's own copy, and `false` draws no note card. The
Nextcloud look is unchanged.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cards` | Array | `null` | The report cards: `{ id, label, description?, category?, icon?, note?, route }`. `icon` and `note` are drawn under the board look. |
| `categories` | Object | `null` | Category key to label. |
| `title` | String | `null` | The heading. Defaults to "Reports". |
| `description` | String | `null` | The lead paragraph. |
| `allCategoriesLabel` | String | `null` | Label of the "all categories" filter option. |
| `categoryLabel` | String | `null` | Label of the category filter. |
| `emptyLabel` | String | `null` | Text shown when the filter admits no card. |
| `widgets` | Array | `null` | Dashboard widgets drawn under the cards. |
| `layout` | Array | `null` | Grid placement of `widgets`: `{ id, widgetId, gridX, gridY, gridWidth, gridHeight }`. |
| `headerButtons` | Array | `null` | Buttons beside the title: `{ label, action, variant?, icon?, id? }`, `action` naming a `headerActions` entry. |
| `headerActions` | Array | `null` | The actions a header button names, in the index page's header action shape. |
| `footnote` | String | `null` | A line under the page, drawn under the board look. |
| `sideNote` | Object, Boolean | `null` | The side column's note card under the board look: `{ title, text }`, or `false` for none. |
| `look` | String | `null` | `board` or `nextcloud`. Absent: the look `CnAppRoot` provides. |
| `translate` | Function | `null` | Translate function. Falls back to the one `CnAppRoot` provides. |
| `page` | Object | `{}` | The whole manifest page, for a host that mounts the component itself. The props above win. |

## Cards from an endpoint, actions, formats and search

```json
{ "id": "Reports", "route": "/reports", "type": "reports",
  "config": {
    "search": true,
    "cards": [
      { "id": "PostingHistory", "label": "Posting history", "route": "GeneralLedger",
        "query": { "subLedgerType": "inventory" } }
    ],
    "cardsSource": {
      "url": "/apps/myapp/api/reporting/types",
      "path": "types",
      "categoriesPath": "categories",
      "action": { "type": "open-modal", "modal": "GenerateReportDialog", "label": "Generate" }
    }
  } }
```

- `cardsSource` reads cards (at `path`) and categories (at `categoriesPath`) from an endpoint and merges them after the declared `cards`. Declared category labels win. A source that cannot be read adds nothing.
- `action` (`{ type: "open-modal", modal, label, params }`) on a card, or given by `cardsSource` to every card it reads without a route, makes the card a button that opens that registry modal with `params`, the card as `report` and the chosen `format`.
- `formats` on a card (strings or `{ value, label }`): with more than one the card offers a format choice; the first is the default.
- `query` goes along with a card's `route`.
- `search: true` adds a search field over label and description.

## Related

- [CnLinkCardsPage](./cn-link-cards-page.md) for grouped link cards that are not reports.

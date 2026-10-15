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

`headerButtons` puts buttons beside the title, as board DcRapportages draws "Downloaden". Each is `{ label, action, variant?, icon?, id? }`, and `action` is the id of a `headerActions` entry, in the shape an index page uses: a registry `handler`, `navigate` with a `route`, `type: "navigate"` with a `target` URL (a new tab), `emit`, or `none`. Every click also emits `header-action` `{ action, id }`, except for `none`. Under the board look the buildiq square sits between the secondary buttons and the primary one. Without `headerButtons` the header is unchanged.

```json
"config": {
  "headerActions": [{ "id": "download", "label": "Download", "handler": "downloadReports" }],
  "headerButtons": [{ "label": "Download", "action": "download", "icon": "Download" }]
}
```

### The board look

Under `look: "board"` (board DcRapportages) the page draws a 28px title over a muted lead, one section per category
headed by its label (cards without a category first, under no heading) instead of the category filter, and two-up cards
with the card's `icon` in a 44px tile, its title at 17px and its description at 14px. The Nextcloud look is unchanged.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cards` | Array | `null` | The report cards: `{ id, label, description?, category?, icon?, route }`. `icon` is drawn in a tile under the board look. |
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
| `look` | String | `null` | `board` or `nextcloud`. Absent: the look `CnAppRoot` provides. |
| `translate` | Function | `null` | Translate function. Falls back to the one `CnAppRoot` provides. |
| `page` | Object | `{}` | The whole manifest page, for a host that mounts the component itself. The props above win. |

## Related

- [CnLinkCardsPage](./cn-link-cards-page.md) for grouped link cards that are not reports.

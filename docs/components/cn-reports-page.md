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
| `catalogue` | Boolean | `null` | In the board look, draw the catalogue: category chips with counts, article cards and an aside with the category index (manifest `config.catalogue`). Without it the board look draws its sections. |
| `cardMeta` | String | `null` | The catalogue card's footer line (`config.cardMeta`), default "Opens a page of its own"; a card's own `meta` wins. |
| `asideNote` | Object | `null` | The catalogue aside's closing card (`config.asideNote`): `{ title, text }`. |
| `panel` | Object | `null` | In the board look, draw the cards in one titled panel (`config.panel`): `{ title, subtitle?, link?: { label, route \| href } }`. A card then also takes `meta`, `pill`, `tone` (`external`, `highlight`), `linkLabel`, `href` in place of `route`, `query`, and `requiresApp` with `missingText`. |

## Actions on a card

`config.cardActions` gives every card actions of its own, drawn as small buttons on the card in each layout and run through the page's action dispatcher with the card as the object: `@objectId` is the card's `id`, `@object.<path>` a card field. `config.cardState` (`{ url, responsePath?, keyField? }`) reads what each card's actions depend on: a list of rows keyed by `keyField` (default `id`) or a map keyed by card id. An action's `visibleWhen` is a local condition on the card with that row as `state`, and the states are read again after an action ran. hermiq offers a subscription per report:

```json
{
  "cardState": { "url": "/apps/hermiq/api/report-subscriptions", "keyField": "report" },
  "cardActions": [
    { "id": "subscribe", "label": "Send weekly", "type": "api-call", "url": "/apps/hermiq/api/report-subscriptions",
      "payload": { "report": "@objectId", "frequency": "weekly" }, "visibleWhen": { "field": "state.frequency", "op": "empty" } },
    { "id": "cancel", "label": "Cancel subscription", "type": "api-call", "method": "DELETE",
      "url": "/apps/hermiq/api/report-subscriptions/@objectId", "visibleWhen": { "field": "state.frequency", "op": "notEmpty" } }
  ]
}
```

A card whose `requiresApp` is missing offers no actions.

## Related

- [CnLinkCardsPage](./cn-link-cards-page.md) for grouped link cards that are not reports.

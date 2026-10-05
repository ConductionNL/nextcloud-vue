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

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cards` | Array | `null` | The report cards: `{ id, label, description?, category?, route }`. |
| `categories` | Object | `null` | Category key to label. |
| `title` | String | `null` | The heading. Defaults to "Reports". |
| `description` | String | `null` | The lead paragraph. |
| `allCategoriesLabel` | String | `null` | Label of the "all categories" filter option. |
| `categoryLabel` | String | `null` | Label of the category filter. |
| `emptyLabel` | String | `null` | Text shown when the filter admits no card. |
| `translate` | Function | `null` | Translate function. Falls back to the one `CnAppRoot` provides. |
| `page` | Object | `{}` | The whole manifest page, for a host that mounts the component itself. The props above win. |

## Related

- [CnLinkCardsPage](./cn-link-cards-page.md) for grouped link cards that are not reports.

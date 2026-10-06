# CnLinkCardsPage

A page of link cards, grouped under captions. It is the manifest page type `links`. Use it for the pages a short menu leaves out: one menu entry opens this page, and the page opens the rest.

Each card has a label, a one-line description, an optional icon and a target. Every string goes through your app's translate function.

## From the manifest

```json
{
  "id": "Modules",
  "route": "/modules",
  "type": "links",
  "title": "Modules and more",
  "config": {
    "description": "Every page that is not in the daily menu.",
    "categories": {
      "sales": "Sales",
      "marketing": "Marketing"
    },
    "cards": [
      { "id": "Leads", "label": "Leads", "description": "Every deal you are working on.", "icon": "CashMultiple", "category": "sales", "route": "Leads" },
      { "id": "Segments", "label": "Segments", "description": "Groups of contacts picked by rules.", "icon": "AccountGroup", "category": "marketing", "route": "Segments" },
      { "id": "Docs", "label": "Documentation", "href": "https://docs.example.org" }
    ]
  }
}
```

`categories` maps a group key to its caption and sets the order of the groups. A card names its group with `category`. A card without one renders first, under no caption. A group with no visible card is not drawn.

An app may have several `links` pages. That is the difference with `reports`, which is one page per app and filters by category.

## A card

| Key | Description |
|-----|-------------|
| `id` | Required. Unique within the page. |
| `label` | Required. The card's title. |
| `description` | One line under the title. |
| `icon` | MDI icon name, for example `CashMultiple`. |
| `category` | Key in `categories`. |
| `route` | A route name (a page `id`), or a router path when it starts with `/`. |
| `params`, `query` | Passed along with `route`. |
| `href` | An external URL. Opens in a new tab. |
| `visibleIf` | The same condition a menu entry takes: `appInstalled`, and dot-path checks against `manifest.runtime`. |
| `permission` | A permission the user must hold. Same rule as the menu: an empty permissions list allows. |

A card has a `route` or an `href`, never both. The manifest validator refuses a card with neither.

A `route` is resolved through the router, so the link is right with and without `/index.php` in the address. A card whose route does not resolve is left out.

## Used by hand

```vue
<CnLinkCardsPage
  title="Modules and more"
  :categories="{ sales: 'Sales' }"
  :cards="[{ id: 'Leads', label: 'Leads', category: 'sales', route: 'Leads' }]" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cards` | Array | `null` | The cards. |
| `categories` | Object | `null` | Group key to caption. |
| `title` | String | `null` | The heading. |
| `description` | String | `null` | The lead paragraph. |
| `emptyLabel` | String | `null` | Text shown when no card is visible. Defaults to "Nothing to open here." |
| `translate` | Function | `null` | Translate function. Falls back to the one `CnAppRoot` provides. |
| `page` | Object | `{}` | The whole manifest page, for a host that mounts the component itself. The props above win. |

## Accessibility

- Each group is a region named by its caption, holding a real list of links. A screen reader announces how many links a group has.
- A card is an `<a>` with a real address. Tab reaches it, Enter opens it, and it can be opened in a new tab.
- The description is tied to its card with `aria-describedby`. The icon is decorative.
- Focus shows as an outline in the primary colour. All colours are Nextcloud variables.

## How a card looks

- A card is a link, and it does not look like a line of prose. The label and the description are never underlined, also under a theme that underlines every link with `!important` (thematiq does). The component sets `text-decoration: none !important` on the card for that reason.
- The label is the card's title: bold, in the main text colour, whatever link colour the theme sets. The description is in the muted text colour.
- Hover changes the whole card: border in the primary colour, hover background and a soft shadow. Keyboard focus adds an outline.
- The page heading keeps 56px free at its start, so the navigation toggle does not cover the first letters of the title. The cards use the full width.

## Related

- [CnNavCardGrid](./cn-nav-card-grid.md) is the widget for a few link cards inside a dashboard.
- [CnReportsPage](./cn-reports-page.md) lists an app's reports.
- [CnAppNav](./cn-app-nav.md) renders the menu this page takes entries from.

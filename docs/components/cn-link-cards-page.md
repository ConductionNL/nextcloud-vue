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
| `note` | A chip under the description: a string, a `{ text, tone?, counts?, when?, textOne? }`, or a list of those. See below. |
| `action` | `user-settings`: the card opens the app's user settings modal instead of a page. Left out where `CnAppRoot` provides no such modal. |

A card has a `route` or an `href`, never both. The manifest validator refuses a card with neither.

A `route` is resolved through the router, so the link is right with and without `/index.php` in the address. A card whose route does not resolve is left out.

## Modules

`config.modules` draws module cards above the link cards (board PqModules): per module an icon, the title, a badge that says whether it is in the menu, a description, a line naming its pages ("4 pages: ...", or "15 pages, including ..." from the pages marked `highlight`), the pages as links, an Open button, and for a module that is off a line linking to where an admin puts it in the menu ("In het menu zetten: Beheerinstellingen"). A module is never turned on from this page. A count ("3 of 6 are in the menu") sits beside the heading and `footnote` under the cards. Schema 2.108.0.

```json
"config": {
  "modulesTitle": "Modules",
  "footnote": "Een beheerder zet een module aan in de beheerinstellingen.",
  "modules": [
    { "id": "sales", "label": "Verkoop", "icon": "CashMultiple", "description": "Leads, prospects en deals.",
      "enabled": true,
      "pages": [{ "label": "Leads", "route": "Leads" }, { "label": "Pijplijn", "route": "Pipeline" }] },
    { "id": "pos", "label": "Kassa", "icon": "CashRegister", "enabledIf": { "menuModules.pos": true },
      "pages": [{ "label": "Kassabon", "route": "PosReceipt" }],
      "settings": { "href": "/settings/admin/pipelinq", "permission": "admin" } }
  ],
  "cards": [ ... ]
}
```

| Module key | Description |
|---|---|
| `id`, `label` | Required. `label` and `description` are translated. |
| `enabled` | Whether the module is in the menu. The app decides; a runtime manifest can set it. |
| `enabledIf` | A `visibleIf` condition against `runtime`, read when `enabled` is not a boolean. |
| `route` | Where Open goes. Defaults to the first page. |
| `pages` | `[{ label, route \| href, highlight? }]`. A page whose route does not resolve is left out. |
| `settings` | `{ label?, prefix?, route \| href, permission?, visibleIf? }`: shown on a module that is off as "{prefix} {label}" (default "Put it in the menu: Admin settings"). Give it a `permission` so only admins see it. |
| `permission`, `visibleIf` | Hide the whole module, as on a card. |

## Groups as list cards

`config.groupStyle: "list"` draws each group as one card with the caption as its title and a row per link: an icon chip, the label over its description, and a chevron (an external-link icon for an `href`). The PqModules board draws "Ook in Pipelinq" and "Meer" this way under the modules. The default, `cards`, is the grid above. Schema 2.108.0.

## Notes on a card

A note says something about what the card opens, in a tone: `neutral` (default), `success`, `warning`, `error` or `info`.

```json
{ "id": "Flows", "label": "Flows", "route": "Flows",
  "note": { "text": "{active} active, {paused} paused", "tone": "success",
    "counts": {
      "active": { "register": "pipelinq", "schema": "flow", "filter": { "status": "active" } },
      "paused": { "register": "pipelinq", "schema": "flow", "filter": { "status": "paused" } } } } }
```

Each count is one `_limit=1` list request; `{name}` in the text is replaced by it. A list of notes shows the first that applies, and a note with `when` applies only while that count is above 0. `textOne` is used when that count (or the first) is 1:

```json
"note": [
  { "text": "{errors} connections have an error", "textOne": "{errors} connection has an error", "tone": "error", "when": "errors",
    "counts": { "errors": { "register": "integriq", "schema": "app_connection", "filter": { "app": "pipelinq", "status": "error" } } } },
  "Telephony, social networks and bulk mail"
]
```

A note whose counts are loading or failed is not shown. Every card ends in a chevron, or in an external-link icon when it opens a URL.

## Only for administrators

`config.adminPanel` draws a panel under the cards that only administrators see: an "Administrators only" pill, `text`, and a link (`href`, or `route`; label `linkLabel`, default "Open admin settings"). `component` names a custom component drawn beside it, such as a read-only view of the app's menu. The `#admin` slot adds more. The panel is a convenience: the settings it links to check the user themselves.

```json
"adminPanel": { "text": "The menu choice applies to everyone.", "href": "/settings/admin/pipelinq", "component": "MenuStructureSummary" }
```

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
| `adminPanel` | Object | `null` | The panel under the cards for administrators: `{ text, href, route, linkLabel, component }`. |
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

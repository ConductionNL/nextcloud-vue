---
sidebar_label: Dashboard Widget Catalog
title: Dashboard Widget Catalog
---

# Dashboard Widget Catalog

The **25 widget types** offered by the dashboard widget library — the catalog
shared by **Buildiq** and **Launchpad** via the communal
[`dashboardWidgetRegistry`](./cn-widget-grid.md). Each type self-registers a
`{renderer, form, defaultContent, displayName, icon}` descriptor, so adding a
widget capability to `@conduction/nextcloud-vue` makes it available to every
consuming app at once.

Every type below was added to a live dashboard and **verified rendering with
real content through the browser** — the screenshots are the actual rendered
widgets, not mock-ups.

:::tip Adding a widget
On a dashboard, enter edit mode → **Add custom widget** → pick a **Widget type**
from the dropdown. The modal swaps in that type's sub-form (documented per-widget
below) and stores the result in the placement's `content` blob. Per-widget chrome
(custom title, background/text colour) is stored separately in `style_config`.
:::

## How resolution works

`BUILT_IN_WIDGETS` (object-detail manifest widgets) → **`dashboardWidgetRegistry`**
(this catalog) → consumer `cnRegistry` inject (override wins last). A consuming
app never mutates the shared registry to re-skin a single widget — it overrides
at the `CnWidgetGrid` resolution boundary. See the
[widget library overview](./cn-widget-grid.md) and
`docs/architecture/cards-and-widgets.md`.

Three further types, `kb-search`, `interaction-form` and `stages`, are registered
for the **detail-page** surface and so do not appear in the dashboard Add-widget
picker. The `data` type is likewise detail-page only.

---

## Content & layout

Static, configuration-only widgets — no data source required.

### Label · `label`

![label widget rendering a styled single-line heading](/img/screenshots/widget-label.png)

Single-line styled text label (font size, colour, weight, alignment) for dashboard grids.
→ [`CnLabelWidget`](./cn-label-widget.md) · [`CnLabelWidgetForm`](./cn-label-widget-form.md)

### Notepad · `notepad`

A personal note typed into in place, saved to the reader's own preferences rather than the layout. User-addable: a reader can add it to their own dashboard with no configuration.
→ [`CnNotepadWidget`](./cn-notepad-widget.md) · [`CnNotepadWidgetForm`](./cn-notepad-widget-form.md)

### Text · `text`

![text widget rendering a markdown heading and body](/img/screenshots/widget-text.png)

Multi-line rich-text / markdown widget with optional table mode (sanitised HTML).
→ [`CnTextWidget`](./cn-text-widget.md) · [`CnTextWidgetForm`](./cn-text-widget-form.md)

### Header Banner · `header`

![header banner widget with title text](/img/screenshots/widget-header.png)

Banner / header widget with background image, overlay, title/subtitle and CTA button.
It can also greet the user: `greeting: true` makes the heading read "Good afternoon,
Pieter", `showDate: true` adds today's date above it, and `plain: true` drops the
coloured background.
→ [`CnHeaderWidget`](./cn-header-widget.md) · [`CnHeaderWidgetForm`](./cn-header-widget-form.md)

### Banner and attention card · `banner`

A notice with a severity (`info`, `warning`, `error`, `success`), an optional
click-through route and an optional `visibleWhen` condition. With
`layout: "attention"` it becomes an attention card: a card with a severity edge, a
`kicker` label, a `title`, a `reason` line and up to two `actions`. Without `layout`
it renders the note card it always did.

```json
{
  "widgetKey": "banner",
  "props": {
    "layout": "attention",
    "variant": "error",
    "kicker": "First today",
    "title": "Parking permits city centre",
    "reason": "The deadline ends today. {value} documents are still missing.",
    "visibleWhen": { "source": { "register": "dossiq", "schema": "case", "filter": { "assignee": "@me", "deadline": "@today" } }, "op": "gt", "value": 0 },
    "actions": [
      { "label": "Open case", "route": { "name": "CaseDetail", "params": { "id": "2026-0061" } } },
      { "label": "All deadlines", "route": "Deadlines" }
    ]
  }
}
```

| Key | Type | Description |
|-----|------|-------------|
| `layout` | `'banner' \| 'attention'` | `banner` (default) is the note card. `attention` is the card described here. |
| `variant` | `'info' \| 'warning' \| 'error' \| 'success'` | The severity. It sets the colour of the edge and the kicker. |
| `kicker` | `string` | The small label above the title. |
| `title` | `string` | The title. Falls back to `text`. |
| `reason` | `string` | The line that says why this needs attention. `{value}` is replaced by the value `visibleWhen` read. |
| `actions` | `Array<{ label, route?, href?, primary?, id? }>` | At most two. The first is the primary one unless an action sets `primary: true`. An action with neither `route` nor `href` renders a button and emits `action`. |
| `visibleWhen` | `object` | Same predicate as the banner. The card stays hidden until it holds. |

**When the check itself fails.** An attention card whose `visibleWhen` request fails (the endpoint or source answers an error, or the network is down) does not stay hidden. It renders one muted line, "Could not check:" followed by the card's title, with the reason as a tooltip, and on a dashboard it keeps its cell. A hidden card would read as "nothing needs attention", and a failed count does not know that. The line carries no severity colour, no alert role and no actions. When the title uses `{value}`, the line says only "Could not check". A request that succeeds with a value that does not meet the condition still renders nothing, and a plain banner (no `layout`) still stays hidden on failure.

The component is `CnBannerWidget`, resolved by its key and configured by `CnBannerWidgetForm`.

### Divider · `divider`

![divider widget rendering a horizontal rule](/img/screenshots/widget-divider.png)

Divider / spacer widget with line style, thickness, colour and optional heading.
→ [`CnDividerWidget`](./cn-divider-widget.md) · [`CnDividerWidgetForm`](./cn-divider-widget-form.md)

### Image · `image`

![image widget rendering the Nextcloud logo](/img/screenshots/widget-image.png)

Image widget with object-fit modes, optional link, and graceful error/placeholder state.
→ [`CnImageWidget`](./cn-image-widget.md) · [`CnImageWidgetForm`](./cn-image-widget-form.md)

### Video · `video`

![video widget embedding an external player](/img/screenshots/widget-video.png)

Video widget supporting YouTube/Vimeo/PeerTube embeds and Nextcloud-file/HTML5 playback.
External embeds require the host page to allow the provider's frame domain in its
Content-Security-Policy (`frame-src`).
→ [`CnVideoWidget`](./cn-video-widget.md) · [`CnVideoWidgetForm`](./cn-video-widget-form.md)

---

## Navigation & links

### Link Button · `link`

![link button widget with an Open Files action](/img/screenshots/widget-link.png)

Link / button widget with single and list display modes; emits
`internal-action` / `create-file` for host-handled actions.
→ [`CnLinkButtonWidget`](./cn-link-button-widget.md) · [`CnLinkButtonWidgetForm`](./cn-link-button-widget-form.md)

### Links · `links`

![links widget rendering a titled section of links](/img/screenshots/widget-links.png)

Sectioned link-collection widget with multiple layout styles. Each section holds
one or more `{label, url, description}` links.
→ [`CnLinksWidget`](./cn-links-widget.md) · [`CnLinksWidgetForm`](./cn-links-widget-form.md)

### Menu · `menu`

![menu widget rendering a navigation item](/img/screenshots/widget-menu.png)

Hierarchical menu widget (dropdown / sidebar / tree) with active-item highlighting.
→ [`CnMenuWidget`](./cn-menu-widget.md) · [`CnMenuWidgetForm`](./cn-menu-widget-form.md)

### Quicklinks · `quicklinks`

![quicklinks widget rendering an icon link](/img/screenshots/widget-quicklinks.png)

Icon-grid quick-links widget with configurable icon size, columns and labels.
→ [`CnQuicklinksWidget`](./cn-quicklinks-widget.md) · [`CnQuicklinksWidgetForm`](./cn-quicklinks-widget-form.md)

### Tile · `tile`

![tile widget rendering a clickable card](/img/screenshots/widget-tile.png)

Clickable card with an icon, title, and configurable colours that navigates by
`linkType` (`app` → resolved Nextcloud route, `url` → external link in a new tab).
→ [`CnDashTileWidget`](./cn-dash-tile-widget.md) · [`CnDashTileWidgetForm`](./cn-dash-tile-widget-form.md)

---

## Nextcloud data

Widgets backed by native Nextcloud APIs (Files, Contacts, Calendar, the Dashboard API).

### Files · `files`

![files widget rendering a folder listing](/img/screenshots/widget-files.png)

Files browser widget (folder navigation, thumbnails, mime filter, sort).
→ [`CnFilesWidget`](./cn-files-widget.md) · [`CnFilesWidgetForm`](./cn-files-widget-form.md)

### People · `people`

![people directory widget rendering user cards](/img/screenshots/widget-people.png)

People directory widget (grid/card/list) with filters and birthdays; data via
`dataSource` / `cnPeopleSource`.
→ [`CnPeopleWidget`](./cn-people-widget.md) · [`CnPeopleWidgetForm`](./cn-people-widget-form.md)

### Calendar · `calendar`

![calendar widget rendering an agenda view](/img/screenshots/widget-calendar.png)

Calendar widget (agenda/upcoming) over internal calendars + external ICS feeds.
The form offers a **calendar picker** (multiselect of the user's own calendars,
supplied by the consuming app via `calendarsFetcher`) instead of free-text
principal URIs; external ICS URLs must be `https://`.
→ [`CnCalendarWidget`](./cn-calendar-widget.md) · [`CnCalendarWidgetForm`](./cn-calendar-widget-form.md)

### Nextcloud widget · `nc-widget`

![nc-widget proxy rendering a native Nextcloud dashboard widget](/img/screenshots/widget-nc-widget.png)

Proxy widget that renders a native Nextcloud Dashboard API widget (v1/v2) inside the grid.
→ [`CnNcWidgetWidget`](./cn-nc-widget-widget.md) · [`CnNcDashboardWidgetForm`](./cn-nc-dashboard-widget-form.md)

---

## OpenRegister analytics

KPI / chart / list widgets that resolve their data from OpenRegister at runtime.
These read sibling-app data via a runtime `source` block or GraphQL — never a
hard `manifest.dependencies` entry.

### Statistic / KPI · `stat`

![stat KPI widget rendering a single large figure](/img/screenshots/widget-stat.png)

Single-value KPI card. Resolves one number from an OpenRegister `source` block at
runtime (aggregate API) and renders it as a large formatted figure with optional
icon, caption, and click-through route.
→ [`CnStatWidget`](./cn-stat-widget.md) · [`CnStatWidgetForm`](./cn-stat-widget-form.md)

### Comparison / delta · `delta`

![delta widget rendering a value with percentage change](/img/screenshots/widget-delta.png)

Comparison / delta card. Resolves two OpenRegister aggregates (current and previous
window) and renders the current value plus the signed percentage change, coloured
by whether the movement is "good" (`goodDirection`).
→ [`CnDeltaWidget`](./cn-delta-widget.md) · [`CnDeltaWidgetForm`](./cn-delta-widget-form.md)

### Gauge / utilization · `gauge`

![gauge widget rendering a value-against-target bar](/img/screenshots/widget-gauge.png)

Gauge / utilization card. Resolves a value and a target from OpenRegister and renders
a radial gauge of value-against-target, coloured by warn/danger thresholds.
→ [`CnGaugeWidget`](./cn-gauge-widget.md) · [`CnGaugeWidgetForm`](./cn-gauge-widget-form.md)

### Saved view · `saved-view`

A list driven by one of the reader's saved views. The configuration is a view id and a
row limit and nothing else: the register, schema, filter and order are read from the
view on every load, so the card follows the view when it is edited on the index page.
A view that was deleted or is no longer shared renders a named refusal, not an empty
list. It is the one data widget a user may add (`userAddable`), because the view
carries the register and schema.
→ [`CnSavedViewWidget`](./cn-saved-view-widget.md) · [`CnSavedViewWidgetForm`](./cn-saved-view-widget-form.md)

### Statistic card · `stats-block`

![stats-block widget rendering a labelled count card](/img/screenshots/widget-stats-block.png)

Pulls a count from OpenRegister's GraphQL endpoint and forwards it to
[`CnStatsBlock`](./cn-stats-block.md) for rendering.
→ [`CnStatsBlockWidget`](./cn-stats-block-widget.md) · [`CnStatsBlockWidgetForm`](./cn-stats-block-widget-form.md)

### Chart · `chart`

![chart widget rendering an ApexCharts bar chart](/img/screenshots/widget-chart.png)

ApexCharts wrapper supporting area, line, bar, pie, donut, and radialBar chart types
with Nextcloud-themed defaults. `apexcharts` / `vue-apexcharts` are peer dependencies.
→ [`CnChartWidget`](./cn-chart-widget.md) · [`CnChartWidgetForm`](./cn-chart-widget-form.md)

### Object list · `object-list`

![object-list widget rendering OpenRegister objects as a table](/img/screenshots/widget-object-list.png)

Fetches a page of OpenRegister objects (register + schema + filter + sort + limit)
at runtime and renders them as a compact column table.
→ [`CnObjectListWidget`](./cn-object-list-widget.md) · [`CnObjectListWidgetForm`](./cn-object-list-widget-form.md)

### Table · `table`

![table widget rendering a compact data table](/img/screenshots/widget-table.png)

Compact data table with a card wrapper, title header, and optional "View all" footer.
Supports external rows (`rows`) or self-fetch (`register` + `schemaId`). Shares the
`object-list` sub-form.
→ [`CnTableWidget`](./cn-table-widget.md) · [`CnObjectListWidgetForm`](./cn-object-list-widget-form.md)

### Stages · `stages`

The stages a record moves through, read from an app endpoint or an OpenRegister
query. Which of them can be reached comes from Open Register's lifecycle
(`/available-actions`), and clicking one performs that transition. The same
contract `CnLifecycleActions` renders as buttons. **Detail-page surface only**: it
reads and moves the bound record, which only a detail page has.
→ [`CnStagesWidget`](./cn-stages-widget.md) · [`CnStagesWidgetForm`](./cn-stages-widget-form.md) · [`CnLifecycleActions`](./cn-lifecycle-actions.md)

### Week strip · `week-strip`

The current week as day columns, with the dated items under each day. Today is
highlighted, late items are marked and an empty day says so. Items come from an
OpenRegister source (one request for the week) or from static `items`.
→ [`CnWeekStripWidget`](./cn-week-strip-widget.md) · [`CnWeekStripWidgetForm`](./cn-week-strip-widget-form.md)

### Stacked bar · `stacked-bar`

One segmented bar with a legend that carries the label and count of every segment.
Segments come from one grouped count request or from static values. The colours are
steps of one ramp that differ in lightness.
→ [`CnStackedBarWidget`](./cn-stacked-bar-widget.md) · [`CnStackedBarWidgetForm`](./cn-stacked-bar-widget-form.md)

---

## Composition & finance

### Container · `container`

![container widget hosting a nested sub-grid](/img/screenshots/widget-container.png)

Recursive sub-grid container widget hosting nested widget placements.
→ [`CnContainerWidget`](./cn-container-widget.md) · [`CnContainerWidgetForm`](./cn-container-widget-form.md)

### Spend analytics · `spend-analytics`

![spend-analytics widget with period tabs](/img/screenshots/widget-spend-analytics.png)

Financial spend-analytics widget with period tabs (this month / quarter / year);
data via `dataSource` / `cnSpendSource`.
→ [`CnSpendAnalyticsWidget`](./cn-spend-analytics-widget.md) · [`CnSpendAnalyticsWidgetForm`](./cn-spend-analytics-widget-form.md)

### Markdown · `markdown`

Prose inside a grid page, rendered through the shared `cnRenderMarkdown` path and sanitised. Registered `public: true`.
→ [`CnMarkdownWidget`](./cn-markdown-widget.md) · [`CnMarkdownWidgetForm`](./cn-markdown-widget-form.md)

## The public flag

Every `registerDashboardWidget()` entry carries `public: boolean`, `false` unless the widget author passes `true`; a non-boolean value throws rather than being coerced. A widget wrongly marked public is an authenticated capability exposed to anonymous visitors, so opting in is a reviewed decision.

`CnWidgetGrid` takes a `host` prop (`nextcloud` or `public`; or the injected `cnHost`). Under `public` a component can only come from a catalog entry registered `public: true`: the consumer registry and the built-ins are not consulted, so the decision and the lookup are one thing. Any other key, known or not, renders the inert placeholder (with a console warning) and its component code never runs; the other widgets on the page render normally. Under the default `nextcloud` host nothing changes. `isPublicWidgetType(type)` answers the same question for tooling.

The gate `scripts/gates/public-widget.mjs <manifest.json>...` (skill `hydra-gate-public-widget`) fails a portal manifest that places a non-public key, naming the page and the key.

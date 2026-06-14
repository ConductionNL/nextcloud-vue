# Design — `manifest-index-page-followups`

## A. Quick-filter tabs (`pages[].config.quickFilters`)

### A.1 Manifest schema

`$defs.config.index` (or wherever the `type:"index"` config lives) gains an optional `quickFilters`:

```jsonc
{
  "quickFilters": {
    "type": "array",
    "items": {
      "type": "object",
      "additionalProperties": false,
      "required": ["label", "filter"],
      "properties": {
        "label":   { "type": "string", "description": "i18n key or plain text — rendered on the tab" },
        "filter":  { "type": "object", "additionalProperties": true, "description": "Filter map merged into the fetch when this tab is active. Same value syntax as config.filter: literal values pass through; `@route.<name>` / `:<name>` resolve from $route.params." },
        "default": { "type": "boolean", "default": false, "description": "Pre-selected on mount" },
        "icon":    { "type": "string", "description": "Optional MDI icon name" }
      }
    },
    "description": "Render a tab strip / segmented control above the table. Clicking a tab merges its `filter` into the fetch — after `config.filter` (fixed) and before user `activeFilters`. Omit for no tabs (current behaviour)."
  }
}
```

### A.2 `CnIndexPage` render

- New data: `activeQuickFilterIndex: number | null` (defaults to the entry's index with `default:true`, else `0` if `quickFilters` is non-empty, else `null`).
- A `<CnQuickFilterBar>` (new small component, or inline `<NcAppNavigationItem>`-ish strip) renders above the table when `quickFilters.length > 0`. Each tab shows `label` + optional `icon`; clicking sets `activeQuickFilterIndex`.
- The `useListView` `fixedFilters` getter (set in `setup()`) is updated to compose: `{ ...resolveFilter(config.filter), ...resolveFilter(quickFilters[activeQuickFilterIndex].filter) }` — quick filter spread LAST so it overrides a colliding `config.filter` entry (intentional — the tab is the user's intent).
- Watch `activeQuickFilterIndex` → `list.refresh(1)` so changing tabs re-fetches at page 1.
- Quick-filter values resolve via the same `@route.X` / `:X` → `$route.params` mechanism as `config.filter` (consistency).

### A.3 No-op when omitted

`quickFilters` absent → component skips rendering the bar and `fixedFilters` composes exactly as today.

## B. Built-in `"link"` cell widget

### B.1 Registration

`CnCellRenderer`'s widget resolution order is consumer registry (`cnCellWidgets`) → built-in `"badge"` → fallthrough. Add `"link"` as a second built-in alongside `"badge"`:

```js
const BUILT_IN_WIDGETS = {
  badge: CnStatusBadge,
  link:  CnLinkCell,
}
```

### B.2 `CnLinkCell` component

Props (resolved by `CnCellRenderer` and spread): `{ value, row, property, formatted, widgetProps }`.

Render logic:

```vue
<template>
  <router-link v-if="resolvedRoute" :to="resolvedRoute">{{ display }}</router-link>
  <a v-else-if="widgetProps?.href" :href="resolvedHref" target="_blank" rel="noopener">{{ display }}</a>
  <span v-else>{{ display }}</span>
</template>
```

- `display` = `formatted ?? value`
- `resolvedRoute` = `widgetProps?.route` (a manifest page id) → `{ name: route, params: { id: row[rowKey ?? 'id'] } }`. (`rowKey` injected from `CnDataTable` via provide/inject — same plumbing `CnRowActions` already uses; default `'id'`.)
- `resolvedHref` = `widgetProps.href` — if it contains `{key}` placeholders, substitute from `row` (`"{id}"` → `row.id`).
- If neither `route` nor `href` resolves AND `widgetProps?.fallback !== 'silent'`, `console.warn` once that the link target is missing.

## C. Built-in `"date"` / `"datetime"` / `"relative-time"` formatters

### C.1 Default registration

`CnAppRoot` (or wherever `cnFormatters` is `provide`d) merges built-in defaults under consumer-supplied formatters: `{ ...BUILT_IN_FORMATTERS, ...props.formatters }` — consumer wins on collision (override path).

### C.2 The formatters

```js
const BUILT_IN_FORMATTERS = {
  /** ISO/timestamp → locale date (no time). */
  date: (value /* , row, property */) => {
    if (value == null || value === '') return ''
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d)
  },
  /** ISO/timestamp → locale date+time. */
  datetime: (value) => {
    if (value == null || value === '') return ''
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  },
  /** ISO/timestamp → "3 days ago" via Intl.RelativeTimeFormat. */
  'relative-time': (value) => {
    if (value == null || value === '') return ''
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    const diffMs = d.getTime() - Date.now()
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    const units = [['year',31536e6],['month',2592e6],['week',6048e5],['day',864e5],['hour',36e5],['minute',6e4]]
    for (const [unit, ms] of units) {
      if (Math.abs(diffMs) >= ms || unit === 'minute') return rtf.format(Math.round(diffMs / ms), unit)
    }
    return rtf.format(0, 'second')
  },
}
```

## D. `config.readOnly:true` shorthand

### D.1 Where the merge happens

`CnPageRenderer`'s `resolvedProps` computed (the one that spreads `config` onto the resolved page component) checks `config.type === 'index' && config.readOnly === true`. When true, it merges a `READ_ONLY_DEFAULTS` map *under* the explicit `config.*` props:

```js
const READ_ONLY_DEFAULTS = {
  selectable: false,
  showAdd: false,
  showFormDialog: false,
  showEditAction: false,
  showCopyAction: false,
  showDeleteAction: false,
  showMassImport: false,
  showMassCopy: false,
  showMassDelete: false,
}
```

```js
resolvedProps() {
  const { readOnly, ...rest } = this.config || {}
  if (this.pageType === 'index' && readOnly === true) {
    return { ...READ_ONLY_DEFAULTS, ...rest, ...this.$route.params }
  }
  return { ...rest, ...this.$route.params }
}
```

Explicit `config.showAdd:true` wins over the default.

### D.2 Schema

`readOnly: { type: "boolean", default: false }` added to the `type:"index"` `config` shape (additive — `additionalProperties:true` already accepts it, the type annotation just documents it).

## E. `pages[].permission`

### E.1 Schema only

Add `permission: { type: "string", description: "Required permission id; consumer-side enforcement only (CnAppRoot does not yet gate the page)." }` to `$defs.page.properties`. No version bump (additive on existing $def).

### E.2 No runtime enforcement (this change)

`CnPageRenderer` / `CnAppRoot` ignore `permission` at render time. Consumers that want enforcement can filter the manifest themselves before passing it to `CnAppRoot`. Runtime gating is a follow-up if/when needed (would need a `permissions` prop comparison).

## F. `handler:"emit"`

### F.1 Where the dispatch happens

The manifest-actions-dispatcher (`CnIndexPage.handleAction(action, item)`, or wherever `handler` is resolved) gains an explicit `"emit"` arm:

```js
function handleAction(action, item) {
  if (action.confirm && !window.confirm(action.confirmText || `${action.label}?`)) return
  switch (action.handler) {
    case 'navigate':
      this.$router.push({ name: action.route, params: { id: item[this.rowKey || 'id'] } })
      return
    case 'emit':
      this.$emit('action', { actionId: action.id, item, action })
      return
    default:
      // existing fallback: registry-name → customComponents[handler]({actionId, item, action})
      const fn = this.resolvedCustomComponents?.[action.handler]
      if (typeof fn === 'function') fn({ actionId: action.id, item, action })
      else if (typeof action.handler === 'function') action.handler(item)
      else this.$emit('action', { actionId: action.id, item, action }) // graceful fallback
  }
}
```

(Existing graceful fallback already emits — `handler:"emit"` just makes it explicit + documented.)

## File-by-file plan

| File | Change |
|---|---|
| `src/schemas/app-manifest.schema.json` | Add `quickFilters` to index `config`; `readOnly` (boolean) to index `config`; `permission` to `$defs.page`; document `handler:"emit"` in the action $def's enum/description. |
| `src/components/CnCellRenderer/CnCellRenderer.vue` | Add `"link"` to built-in widget map. |
| `src/components/CnLinkCell/CnLinkCell.vue` | New small component (router-link / a / span fallback). |
| `src/components/CnLinkCell/CnLinkCell.md` | Styleguide doc. |
| `docs/components/cn-link-cell.md` | Per-component doc (the `check:docs` gate). |
| `src/utils/builtInFormatters.js` (new) | `date` / `datetime` / `relative-time` formatters. |
| `src/components/CnAppRoot/CnAppRoot.vue` | Merge `BUILT_IN_FORMATTERS` under `props.formatters` when providing `cnFormatters`. |
| `src/components/CnPageRenderer/CnPageRenderer.vue` | `readOnly:true` shorthand in `resolvedProps`. |
| `src/components/CnIndexPage/CnIndexPage.vue` | Quick-filter tab strip + `activeQuickFilterIndex` data + compose into `fixedFilters` getter; `handler:"emit"` arm in `handleAction`. |
| `docs/migrating-to-manifest.md` | "Quick-filter tabs" + "Built-in `"link"` widget" + "Built-in date formatters" + "`config.readOnly`" + "`pages[].permission`" + "`handler:"emit"`" sections. |
| `docs/components/cn-index-page.md` | `quickFilters` config doc; `readOnly` shorthand; `handler:"emit"` mention. |
| `tests/components/CnLinkCell.spec.js` | Renders `router-link` when `route` set; `a` when `href`; `span` fallback + warn. |
| `tests/utils/builtInFormatters.spec.js` | date/datetime/relative-time over ISO inputs + null/empty/invalid. |
| `tests/components/CnIndexPage.spec.js` (or new spec file) | Quick-filter tab activation re-fetches with merged filter; `readOnly:true` config disables CRUD UI. |
| `tests/schemas/app-manifest.spec.js` | `quickFilters` validates; `pages[].permission` validates; column with `widget:"link"` validates. |

## Risks

- Built-in formatters/widgets merged UNDER consumer entries — a consumer who already registered a `date` formatter keeps winning.
- `readOnly:true` shorthand: must merge under the explicit `config.*` props so explicit `showAdd:true` still wins. Test this.
- Quick-filter tabs interact with `config.filter`: composition order is `config.filter` → quick-filter → user `activeFilters`; quick wins over fixed (intentional — the tab is the user's intent). Document.

## Seed data

N/A — library change, no apps' register data touched.

# @conduction/nextcloud-vue — Agent Instructions

## What This Library Is

A shared Vue 2 component library for Conduction Nextcloud apps that:
- **Complements** @nextcloud/vue with higher-level components (data tables, list layouts, filter bars)
- **Integrates** NL Design System tokens via CSS variable fallbacks
- **Includes** a generic Pinia store for OpenRegister CRUD operations
- **Provides** composables for common list/detail view patterns

## Using Components

Always check this library BEFORE building custom components. Import from the barrel:

```js
import { CnDataTable, CnPagination, CnStatusBadge } from '@conduction/nextcloud-vue'
import { useObjectStore } from '@conduction/nextcloud-vue'
import '@conduction/nextcloud-vue/src/css/index.css'
```

### Available Components
- `CnDataTable` — Sortable data table with selection, loading, empty states
- `CnFilterBar` — Search + filter controls row
- `CnListViewLayout` — Full list page layout (header + filters + table + pagination)
- `CnDetailViewLayout` — Detail page layout (back + title + actions + content)
- `CnStatusBadge` — Color-coded status/priority pill badge
- `CnEmptyState` — Empty state with icon, title, description, action
- `CnPagination` — Full pagination with page numbers and size selector
- `CnSettingsCard` — Collapsible settings card
- `CnStatsBlock` — Stats display with count and breakdown
- `CnConfigurationCard` — Configuration card with status and actions

### Available Store
- `useObjectStore` — Generic Pinia store for OpenRegister objects (CRUD, pagination, search, caching)
- `createObjectStore(id)` — Factory to create store with custom ID

### Available Composables
- `useListView(options)` — Search debounce, filter state, sort, pagination
- `useDetailView(options)` — Load, edit, delete state management
- `useFileSelection(options)` — File upload/drop handling

## Rules for Modifying Components

1. **NEVER break existing prop interfaces** — new props MUST have defaults
2. **NEVER remove props, events, or slots** — deprecate with console.warn instead
3. **Always maintain backwards compatibility** — existing consumers must not break
4. **Always ask the user before upgrading a component** — propose changes via discussion first
5. **Run `npm test` before submitting changes**
6. **CSS class prefix**: All classes use `cn-` prefix to avoid collisions
7. **NL Design tokens**: Use double-fallback pattern: `var(--nldesign-*, var(--color-*))`
8. **Translation**: Components accept pre-translated strings via props with English defaults. Never import `t()` from a specific app.

## Adding New Components

1. Create directory: `src/components/CnMyComponent/`
2. Create Vue SFC with `name: 'CnMyComponent'`
3. Add JSDoc to every prop, event, slot, and method
4. Add `index.js` re-export
5. Add to `src/components/index.js` barrel
6. Add to `src/index.js` barrel
7. Write test in `tests/components/`
8. Use Nextcloud CSS variables with NL Design fallbacks

## Project Structure

```
src/
  index.js              # Main barrel export
  components/           # Vue SFC components (CnPrefixed)
  store/                # Pinia stores
  composables/          # Vue composables
  css/                  # Global CSS modules
  utils/                # Utility functions
```

## Consumer Apps

This library is used by: OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash.
Changes here affect all of them. Test carefully.

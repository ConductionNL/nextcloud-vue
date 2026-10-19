# CnSavedViewsPanel

The saved views of an index page, in the Filters tab of its sidebar (beside Search and Columns) ([`CnIndexSidebar`](./cn-index-sidebar.md)). [`CnIndexPage`](./cn-index-page.md) fills it through the sidebar's `savedViews` prop on every page with `allowSavedViews`; such a page gets the sidebar even when it declared none, unless it set `sidebar.enabled: false`.

What it shows:

- a **Save view** button (nl "Weergave opslaan") that saves the current search term, filters and sort as a new view;
- the views, in sections **My views**, **Shared with me** and the read-only **Default views** (from `config.defaultSavedViews`), each name applying it, with its description (or who shared it) on a second line;
- per view, a labelled **Manage "{name}"** menu (nl "Beheer {name}"), in the order the boards draw it.

| Access | Entries |
|--------|---------|
| `owner` | Edit, Update with current filters, Share, Delete |
| `write` (shared "May update") | Update with current filters, Save a copy |
| `read` (shared "May use"), default | Save a copy |
| everyone, when `menuIds` is given | Add to menu / Remove from menu |

How a view shows (table, board, calendar) is not in this menu: the boards draw no such entry.

Only the owner sees Edit and Delete; OpenRegister refuses the rest server-side as well.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `views` | `Array` | `[]` | The views, defaults included. |
| `loading` | `Boolean` | `false` | Shows a loading note. |
| `currentUserId` | `String` | `''` | Decides ownership for a view without `@self.access`. |
| `counts` | `Object` | `null` | Record counts by view id or slug. |
| `selectedViewId` | `String` | `''` | The applied view, marked pressed. |
| `maxDepth` | `Number` | `3` | How deep the tree indents. |
| `menuIds` | `Array` | `null` | Ids of the views this user added to the app menu; `null` offers no Add to menu. |

## Events

`apply`, `save-request`, `edit-request`, `share-request`, `presentation-request`, `update-request`, `copy-request`, `menu-toggle`, `delete-request`, each with the view (none for `save-request`). In the sidebar they arrive as one `saved-view` event, `{ action, view }`.

## In the app menu

Add to menu stores `{ id, page, name }` in the user's preferences (`cn_saved_view_menu`), held by [`CnAppRoot`](./cn-app-root.md), so a view shared with the user can be added like an own one and removing it never touches the filter. The entries form the standard **My views** section at the bottom of the menu, after every main entry and just above the footer entries (Help, Advanced), the same in every app; it replaces app-specific groups such as dossiq's "My case types". Each entry links to the page with `?savedView=<id>`, which applies it. An app with a page that offers saved views shows the section also while none is pinned, with one line saying how to add one ("Zet een weergave in het menu via Filters"), so it can be found; an app without saved views shows no section. A `default:<slug>` entry resolves against the page's default views after the per-user `/api/manifest` delta merged in, so a user's own defaults stay in the menu. Entries for filters that were deleted or are no longer shared drop out the next time the page lists its filters.

The entry shows a count when the view's `overrides.badge` asks for one (see below). [`CnAppRoot`](./cn-app-root.md) fetches it like a filtered menu count, and fetches it again when objects of that list change.

## Page config overrides

A view can change more than the filters. A default view declares `overrides` beside its `filters`; a saved view keeps the same object in `query.overrides`, so a copy of a default keeps it. While the view is applied, the page is drawn with these keys laid over its own config. Clearing the view, applying a view without overrides, or following a link to the page without `?savedView=` brings the page's own config back.

```json
{
	"slug": "my-work",
	"name": "Assigned to me",
	"filters": { "assignee": "@me" },
	"overrides": {
		"title": "Assigned to me",
		"breadcrumb": { "label": "My work", "route": "MyWorkHome" },
		"viewMode": "cards",
		"viewModes": ["cards", "table"],
		"sortOption": "urgency",
		"slots": { "below-header": ["WorkloadSummaryBar"] },
		"badge": { "counterVariant": "attention" }
	}
}
```

| Key | What it does |
|-----|--------------|
| `title`, `showTitle`, `breadcrumb`, `headerMeta`, `notice`, `pageTabs`, `headerButtons`, `addLabel`, `searchPlaceholder`, `statRow`, `quickFilters`, `quickFiltersFrom`, `quickFilterPlacement`, `quickFilterMaxVisible`, `sidePanel`, `afterList`, `columns`, `cardLayout`, `cardFields`, `cardComponent`, `listConfig`, `viewModes`, `viewMode`, `viewSwitch`, `countText`, `footerNote`, `emptyText`, `folderSidebar`, `sidebar`, `defaultSort`, `rowClickToView`, `showViewAction`, `actions`, `includeFields`, `fieldOverrides` | Replace the page config key of the same name, in its shape. `folderSidebar: null` hides the folder sidebar. |
| `header` | Groups `title`, `showTitle`, `breadcrumb`, `notice`, `headerMeta` and `headerButtons`. A key spelled out beside it wins. |
| `tabs`, `views` | Aliases of `pageTabs` and `viewModes`. |
| `sortOption` | Selects the `sortSelectOptions` entry with this value, an endpoint-sourced one included. |
| `slots` | Lays registry components over the page's named slots (`below-header`, `before-collection`, ...): one name, or a list drawn in order. `null` or `[]` empties the slot. |
| `badge` | A count on the view's menu entry. `true`, or `count: true`, counts the view's own list: the page's register, schema and base filter with the view's filters. `count` may also be `{ register?, schema?, filter? }`. `counterVariant: "attention"` draws the attention pill. |

Nothing else is read: a view never changes which register or schema the page reads, or what it may write. [`CnIndexPage`](./cn-index-page.md) reports the applied view's overrides with `view-overrides`, and [`CnPageRenderer`](./cn-page-renderer.md) lays them over the page, so the overrides apply on manifest pages.

A breadcrumb crumb can carry a `query` beside its `route`, so a crumb or a page tab can land on a view: `{ "label": "Privacy", "route": "Cases", "query": { "savedView": "default:data-subject-requests" } }`.

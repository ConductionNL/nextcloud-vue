# CnSavedFiltersPanel

The saved filters of an index page, in the Filters tab of its sidebar (beside Search and Columns) ([`CnIndexSidebar`](./cn-index-sidebar.md)). [`CnIndexPage`](./cn-index-page.md) fills it through the sidebar's `savedFilters` prop on every page with `allowSavedViews`; such a page gets the sidebar even when it declared none, unless it set `sidebar.enabled: false`.

What it shows:

- a **Save filter** button (nl "Filter opslaan") that saves the current search term, filters and sort as a new filter;
- the filters, in sections **My filters**, **Shared with me** and the read-only **Default filters** (from `config.defaultSavedFilters`), each name applying it, with its description (or who shared it) on a second line;
- per filter, a labelled **Manage "{name}"** menu (nl "Beheer {name}"), in the order the boards draw it.

| Access | Entries |
|--------|---------|
| `owner` | Edit, Update with current filters, Share, Delete |
| `write` (shared "May update") | Update with current filters, Save a copy |
| `read` (shared "May use"), default | Save a copy |
| everyone, when `menuIds` is given | Add to menu / Remove from menu |

How a filter shows (table, board, calendar) is not in this menu: the boards draw no such entry.

Only the owner sees Edit and Delete; OpenRegister refuses the rest server-side as well.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `views` | `Array` | `[]` | The filters, defaults included. |
| `loading` | `Boolean` | `false` | Shows a loading note. |
| `currentUserId` | `String` | `''` | Decides ownership for a view without `@self.access`. |
| `counts` | `Object` | `null` | Record counts by view id or slug. |
| `selectedViewId` | `String` | `''` | The applied filter, marked pressed. |
| `maxDepth` | `Number` | `3` | How deep the tree indents. |
| `menuIds` | `Array` | `null` | Ids of the filters this user added to the app menu; `null` offers no Add to menu. |

## Events

`apply`, `save-request`, `edit-request`, `share-request`, `presentation-request`, `update-request`, `copy-request`, `menu-toggle`, `delete-request`, each with the view (none for `save-request`). In the sidebar they arrive as one `saved-filter` event, `{ action, view }`.

## In the app menu

Add to menu stores `{ id, page, name }` in the user's preferences (`cn_saved_filter_menu`), held by [`CnAppRoot`](./cn-app-root.md), so a filter shared with the user can be added like an own one and removing it never touches the filter. The entries form a **My filters** group in the menu, after the last entry that opens the filter's page and before the next caption, and link to the page with `?savedFilter=<id>`, which applies it. Entries for filters that were deleted or are no longer shared drop out the next time the page lists its filters.

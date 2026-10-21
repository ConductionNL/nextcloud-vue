# Design: saved-views-manage-and-defaults

## Where the saved views live

The list is `CnSavedViewsPanel`, in a third `CnIndexSidebar` tab (`filters-tab`,
after Search and Columns) through one `savedViews` prop; an `activeTab` prop
lets the page switch to it after a save. The sidebar is hoisted into
CnAppRoot (props and listeners only, no slots), so every intent comes back as
one `saved-view` event `{ action, view }` that `CnIndexPage` dispatches to
its existing handlers. Each row is a plain button (apply) and an `NcActions`
menu with labelled entries; inside the sidebar NcActions nests normally, so the
earlier in-toolbar "manage state" is gone. The list logic the panel and the
toolbar chips share (tree, sections, labels, counts, access) is the
`savedViewsList` mixin. Test ids are the ones the toolbar menu had.

## Add to menu

`CnAppRoot` owns `{ entries, toggle, sync }` and provides it as
`cnSavedViewMenu`. It reads `cn_saved_view_menu` once, and only when a
manifest page has `allowSavedViews`. `menuManifest` puts the entries in the menu
as a "My views" caption group (`withSavedViewMenu`), after the last entry
that opens the page and before the next caption, with `order` values between
its neighbours; without entries it still returns the manifest by
identity. An entry is `{ id: "saved-view-<id>", route: <page>, query:
{ savedView: <id> } }`, so CnAppNav's existing query rule marks it active
while the address names it. `CnIndexPage` applies `?savedView=` once its
views loaded, keeps the key while that view is applied, and drops it on any
other change. After a successful list load it syncs its page's entries (names,
gone views); an empty list never syncs.

## Access

`viewAccess()` already resolves `owner | write | read` from `@self.access`.
A default carries `seeded: true` and resolves to `read`. The server stays the
authority: every mutation goes to OpenRegister, which refuses what the caller
may not do (owner-only delete is fixed there in the same round).

## Defaults

`CnIndexPage` gets a `defaultSavedViews` prop (the manifest key maps straight
onto it, like every index config key). A computed turns each entry into a view:

```js
{ id: `default:${slug}`, slug, name, seeded: true, owner: '', '@self': { access: 'read' },
  query: { filters, search, sort, scope } }
```

and prepends them to `viewsForControl`. `onApplySavedView` resolves tokens in
the filters of a `seeded` view with `resolveFilterTokens(filters, selfFetchTokenCtx())`
before it writes them into the list state. Counts use the same path as other
views.

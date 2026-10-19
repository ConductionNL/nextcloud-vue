# Design: saved-filters-manage-and-defaults

## The manage menu inside NcActions

NcActions only renders `NcAction*` children, and nested menus are not
supported. The control therefore keeps one piece of state, `managing` (the view
being managed, or null). With it null the menu lists rows as now, each row an
`NcActionButtonGroup` of the name button and one `DotsHorizontal` "Manage
{name}" button. Clicking Manage sets `managing`; the menu stays open
(`NcActionButton` does not close on click by default) and renders:

- Back, with the filter's name (`cn-saved-views-back`)
- Edit (`cn-saved-views-edit`), owner
- Share (`cn-saved-views-share`), owner
- Presentation (`cn-saved-views-presentation`), owner or write
- Update with current filters (`cn-saved-views-update`), owner or write
- Save a copy (`cn-saved-views-copy`), read or default
- Delete (`cn-saved-views-delete`), owner

The test ids stay those of the icon buttons they replace, so the existing
specs keep their anchors. Closing the menu resets `managing`.

## Access

`viewAccess()` already resolves `owner | write | read` from `@self.access`.
A default carries `seeded: true` and resolves to `read`. The server stays the
authority: every mutation goes to OpenRegister, which refuses what the caller
may not do (owner-only delete is fixed there in the same round).

## Defaults

`CnIndexPage` gets a `defaultSavedFilters` prop (the manifest key maps straight
onto it, like every index config key). A computed turns each entry into a view:

```js
{ id: `default:${slug}`, slug, name, seeded: true, owner: '', '@self': { access: 'read' },
  query: { filters, search, sort, scope } }
```

and prepends them to `viewsForControl`. `onApplySavedView` resolves tokens in
the filters of a `seeded` view with `resolveFilterTokens(filters, selfFetchTokenCtx())`
before it writes them into the list state. Counts use the same path as other
views.

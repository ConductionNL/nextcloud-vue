# Tasks: runtime-detail-layout

Sibling half of buildiq `case-page-layout-per-case-type` 3.2. Owner nextcloud-vue.

## 1. The read

- [ ] 1.1 `layoutLeaf` prop on `CnDetailPage` (and `config.layoutLeaf` through `CnPageRenderer`), default `''`, no request when empty.
- [ ] 1.2 After the object loads (and on id change), read `{apiBase}/objects/{register}/{schema}/{id}/integrations/{layoutLeaf}` and keep `items[0]` or null; a failing read is null.
  - jest: no request when empty; one request after load; null on 404 and on `items: []`.

## 2. The merge

- [ ] 2.1 Effective `headerFields`, `sidebarTabs` and `widgets` computed from the props and the resolved layout per D2 (part replaces whole; absent part keeps the manifest's; unknown tab ids ignored with a warning).
  - jest: header replaced; tabs reordered, relabelled and narrowed; widgets replaced; absent parts kept.

## 3. Handing on

- [ ] 3.1 Emit `layout-resolved` with the layout and expose it as `layout` on the injected `objectSidebarState` (D3).
  - jest: event payload carries `taskList` and `uploadFields`.

## 4. Docs

- [ ] 4.1 Document `layoutLeaf` in the `CnDetailPage` docs and the manifest schema (`config.layoutLeaf`, string), with the buildiq leaf as the example.

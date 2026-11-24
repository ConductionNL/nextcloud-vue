# Tasks: index-page-custom-views

- [x] 1. `CnIndexPage`: `customViews` prop, `customViewEntries` / `activeCustomView` / `customViewSegments`, the segments in `effectiveToggleModes` (so `?_view=` opens them), and the render branch handing the filtered rows to the named component.
- [x] 2. `CnActionsBar`: `customViewSegments` prop and its segment definitions; mode validators accept the ids.
- [x] 3. Manifest schema: no change; `pages[].config` is free-form and reaches `CnIndexPage` as props.
- [x] 4. Tests: `tests/components/CnIndexPageCustomViews.spec.js`.
- [x] 5. Docs: `docs/components/cn-index-page.md`.

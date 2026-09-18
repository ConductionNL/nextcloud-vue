# Tasks: a-saved-view-drives-a-widget

Row 10.10. Owner nextcloud-vue.

## 1. The type

- [ ] 1.1 Register `saved-view` in
      `src/components/CnWidgetGrid/dashboardWidgetRegistry.js` with
      `userAddable: true`. Its props are a view id and a row limit, and
      nothing that duplicates the view.
      - jest: the type appears in `listWidgetTypes()` and in
        `listUserAddableWidgetTypes()`
- [ ] 1.2 `CnSavedViewWidget`: resolve the view through
      `useSavedViewsApi`, then render its rows with the table the
      `object-list` widget already uses.
      - jest, mutation-checked: replacing the resolved view's filter with
        the widget's own config reddens the assertion that the widget
        follows an edited view

## 2. Configuration

- [ ] 2.1 A config sub-form listing the reader's views, own and public, the
      same list `CnSavedViewsControl` shows.
      - jest: a reader with no views sees the empty state and not a blank
        select
- [ ] 2.2 `src/schemas/app-manifest-v2.schema.json` accepts the type;
      regenerate the compiled validator with `scripts/build-validators.js`.

## 3. Refusal

- [ ] 3.1 A view that cannot be read renders a named refusal rather than the
      empty state.
      - jest: a 404 and a 403 each render the refusal; an empty result set
        renders the empty state

## 4. Tests and docs

- [ ] 4.1 `docs/components/dashboard-widget-catalog.md` gains the entry, and
      the generated component pages follow.
- [ ] 4.2 `npm run check:docs`, `npm run check:smoke` and
      `npm run check:vue3-compile` clean.

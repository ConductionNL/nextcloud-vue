# Proposal: declared-props-detail-index-sidebar

## Why

dashboard-declared-widget-props (#1683) stopped CnDashboardPage from binding undeclared content keys as attributes. Three
other widget hosts still did: CnDetailWidgetHost (`v-bind="content"` and `{ ...base, ...content }`), CnIndexPageWidgets
(`v-bind="entry.content"`) and CnObjectSidebar (a sidebar widget's own `props`). An undeclared key there falls through
onto the widget's root component and can override what the widget computes.

## What changes

- The three hosts pass a widget only the content keys (for the sidebar: the per-widget `props`) its component declares,
  through the same `pickDeclaredProps` the dashboard uses.
- The host's own context bindings (object id, register, schema, object data, the container bindings, a card title) are
  passed as before.
- The whole content still arrives as `content` on the detail page and the index page.
- A component with `inheritAttrs: false` keeps receiving every key. A key that reaches nothing (the component declares
  neither it nor `content`) is warned about once outside production.

## Fleet check

The detail-page and index-page content keys are the ones #1683 checked: none is lost. In sidebars, shillinq passes
keys such as `collapsed`, `source`, `register` and `filter` to the `data` widget (CnObjectDataWidget), which declares
none of them. They only ever landed as attributes on its root element, so dropping them changes no rendering. They now
warn in development. zaakafhandelapp's sidebar `object-table` forwards its attributes and keeps every key.

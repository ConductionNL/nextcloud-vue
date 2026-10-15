---
kind: code
---

# Proposal: dashboard-tabs-children

## Summary

A `tabs` widget on a dashboard page showed "No widget found" in every tab. The detail page hands the widget its
sibling definitions (`availableWidgets`) through CnDetailWidgetHost, and the dashboard page handed it nothing, so no tab
could find the widget it names. Board ShBank (shillinq) draws Rekeningen, Afschriften, Niet gematcht and Valutakoersen
as such a tab strip, and ShDebiteurenbeheer draws Openstaand, Herinneringsrondes and Betaalverzoeken.

The dashboard page now gives a container widget (registry `container: true`, so `tabs` and `sections`) the page's
widget definitions (with the chosen view's), the consumer registry and the page's surface. A tab's `countFrom:
"widget"` also counts a child whose list sits in `content.source`, the shape a dashboard `object-table` stores, so a
dashboard tab carries a count as a detail tab does.

## Scope

- `src/components/CnDashboardPage/CnDashboardPage.vue`: `containerBindings(item)`, bound beside the content on the
  registry branch of the KPI row and the grid.
- `src/components/CnTabsWidget/CnTabsWidget.vue`: `countSourceOf` reads `content.source`.
- `src/utils/widgetDispatch.js`: `resolveRegistryRenderer` takes `{ typeAsWritten }`; `CnDetailWidgetHost` passes it on
  a dashboard surface, so an `object-table` in a dashboard tab is the object-table host (which reads `content.source`)
  as it is on the dashboard grid, not the `table` widget its alias names. A detail page resolves as before.
- No manifest schema change: a dashboard widget's `content` is not validated field by field.
- A leaf widget gets no new attributes. A tab whose child keeps its list in `content.register` counts as before.

---
kind: code
---

# Proposal: widget-title-eyebrow

## Summary

Board ShLiquiditeit puts a short muted line above a card's title: "Saldo per week" above "Prognose 13 weken". A
dashboard widget's card header had only the title.

A dashboard widget definition takes `eyebrow`, a string run through the host translate. CnWidgetWrapper gets an
`eyebrow` prop and draws it as a 13px line in the muted text colour above the title, 2px apart, as the board does. Without
one the header is drawn exactly as before.

## Scope

- `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`: the `eyebrow` prop, `resolvedEyebrow`, the title stack and its
  two rules.
- `src/components/CnDashboardPage/CnDashboardPage.vue`: `getWidgetEyebrow(item)`, bound on every widget card and in
  `kpiWrapperProps`.
- `docs/components/cn-widget-wrapper.md`: the prop.
- No manifest schema change: a dashboard widget definition is not validated field by field.

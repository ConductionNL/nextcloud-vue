# Proposal: dashboard-declared-widget-props

## Why

CnDashboardPage bound every key of a widget's `content` as an attribute on the widget's renderer. A key the renderer
does not declare as a prop fell through onto its root component and could override a value the widget computes there.
That was the CnInteractionFormWidget `submitLabel` bug, fixed for that one widget in #1677. The L22 audit found ten
library widgets whose root component has a prop a content key could land on, and side effects on plain roots: a tabs
widget's `ariaLabel` landed on its generic root `div`, a record list's `title` became a tooltip over the whole card.

## What changes

- CnDashboardPage passes a registry widget only the content keys its renderer declares as props, plus the explicit
  bindings (`widgetId`, `content`, the container bindings, `chromeless` for a card grid).
- The whole content still arrives as `content`, which is how most widgets read their configuration.
- A renderer with `inheritAttrs: false` forwards its attributes on purpose, so it keeps receiving every key. So does a
  functional component without props and an async component that has not loaded.
- A key the renderer does not declare is dropped. When the renderer has no `content` prop either, the key reaches
  nothing, so outside production the page warns once per widget type and key.
- `src/utils/declaredProps.js` holds the rule (`declaredPropNames`, `pickDeclaredProps`), following `extends` and
  `mixins`.

## Fleet check

Every content key the fleet's manifests send (319 type/key pairs across 1,269 manifest files) either is a declared prop
of its renderer, is read from `content`, or goes to a renderer with `inheritAttrs: false`. No app widget reads an
undeclared key from `$attrs` with attribute inheritance on.

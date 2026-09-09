# Design: dashboard widget catalog at boot

## Component and surface

- `CnDashboardPage.vue`: adds `import '../CnWidgetGrid/registerDashboardWidgets.js'`
  so the catalog registers whenever the dashboard page type's chunk runs,
  the way `CnDetailPage` already does.
- `registerDashboardWidgets.js`: registration guarded by a module-level
  `registered` flag, and `registerBuiltinDashboardWidgets()` returns early
  when it has run.
- `package.json`: `registerDashboardWidgets.js` and the catalog entry points
  listed in `sideEffects`, so Rollup and a consumer's webpack keep the import.
- `CnPageRenderer`: the `dashboard` lazy entry resolves the catalog module
  before mounting, matching the `detail` entry.

Kind: code.

## Why import, not a call in the app

`registerBuiltinDashboardWidgets()` in `main.js` works and is documented. It
is also the line every app can forget, and the failure is a rendered page
with five fallback boxes, not an error. The page type that reads the registry
is the right owner of the registration.

## Proof

The unit test mounts `CnDashboardPage` in a fresh module registry, with no
`CnDetailPage` import anywhere in the test, and asserts that a `stat` layout
item renders `CnStatWidget` and not the `unavailableLabel` wrapper. A second
test asserts the registry size is unchanged after a second
`registerBuiltinDashboardWidgets()` call.

## Alternatives considered

- Documenting the `main.js` call harder: it is already documented and was
  still missed.
- Registering every widget eagerly in the library barrel: rejected, it pulls
  every widget into every consumer's initial chunk.

# A page, widget or action can follow a feature toggle

## Why
OpenRegister's `feature-toggle-surface` keeps per-instance feature toggles (`FeatureToggleService`, tasks 1.2 and 1.3a)
and asks the manifest runtime for the client half: `features` in the manifest schema (task 1.1) and `visibleIf.feature`
for pages, widgets and actions (task 2.2, vitest 3.2b).

## What changes
- Manifest schema 2.185.0: top-level `features: [{ key, label, description?, default, failMode? }]`,
  `visibleIfCondition.feature`, `visibleWhen.feature`.
- `utils/featureFlags.js`: `setFeatureFlags` and `featureEnabled` (server map, then default; failMode when no map;
  undeclared off). CnAppRoot sets them from the manifest and initial state `features`.
- `passesContextPredicates` (menu entries, pages, cards) and `evaluateVisibleWhen(Local)` (widgets, actions) honour
  `feature`.
- Not in this change: the admin Features section (task 2.1), which needs an HTTP write contract on the server.

# Feature toggles

An app declares its feature toggles in the manifest, and a page, menu entry, widget or action can follow one.

```json
{
  "features": [
    { "key": "payroll", "label": "Payroll", "description": "Run payroll in this app.", "default": true },
    { "key": "beta-reports", "label": "Beta reports", "default": false, "failMode": "closed" }
  ],
  "menu": [{ "id": "payroll", "label": "Payroll", "route": "Payroll", "visibleIf": { "feature": "payroll" } }]
}
```

- `visibleIf.feature` (menu entries, pages, cards) hides the entry while the toggle is off.
- `visibleWhen.feature` (widgets, actions) is a precondition like `appInstalled`. On its own it is the whole condition. Combined with another mode, both must hold.

The server owns the values. OpenRegister's `FeatureToggleService` merges the declarations with the administrator's overrides, and the app's page controller hands the merged map to the client as initial state `features` (`{ "<key>": true|false }`). `CnAppRoot` reads it with the manifest's declarations when it starts. A toggle reads as follows:

1. the server's value, when the map has the key;
2. the declaration's `default`, when the map lacks the key;
3. when the server served no map at all, `failMode`: `open` reads on, `closed` reads off; unset falls back to `default`.

An undeclared key always reads off.

`setFeatureFlags({ declarations, values })` and `featureEnabled(key)` live in `utils/featureFlags.js` for hosts that do not mount `CnAppRoot`.

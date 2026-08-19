## 1. Schema — navCardEntry shape

- [ ] 1.1 Add `navCardEntry` `$def` to `src/schemas/app-manifest-v2.schema.json`: `required: ["id","label"]`, `additionalProperties: false`, properties `id`, `label`, `description`, `icon`, `route`, `href`, `count` (integer|"auto"), `order`, `permission`, `visibleIf` (`$ref` to `visibleIfCondition`).
- [ ] 1.2 Add an `allOf`/`not` guard on `navCardEntry` rejecting `route` + `href` both present.
- [ ] 1.3 Apply the `sentinelGuardedValue` `allOf` ref to `navCardEntry` (same guard `widgetEntry` uses) so its string leaves honour the closed sentinel vocabulary.

## 2. Schema — nav-card-grid widgetEntry constraint

- [ ] 2.1 Add a `nav-card-grid` `if`/`then` branch to `widgetEntry.allOf`, following the existing `object-table` branch shape: `if widgetKey === "nav-card-grid"` then `props.entries` required, `type: array`, `items: { $ref: "#/$defs/navCardEntry" }`.

## 3. Version bump

- [ ] 3.1 Bump `src/schemas/app-manifest-v2.schema.json` top-level `version` from `2.22.0` to `2.23.0`.

## 4. Fixtures and tests

- [ ] 4.1 Add a valid `nav-card-grid` widgetEntry fixture (2-3 `navCardEntry` items covering `route`, `href`, `count: "auto"`, `count: <integer>`, and one item with neither `route` nor `href`).
- [ ] 4.2 Add an invalid fixture: `navCardEntry` declaring both `route` and `href` — must fail validation.
- [ ] 4.3 Add an invalid fixture: `nav-card-grid` widgetEntry missing `props.entries` — must fail validation.
- [ ] 4.4 Add an invalid fixture: `navCardEntry` with an unrecognised `count` string (e.g. `"sometimes"`) — must fail validation.
- [ ] 4.5 Add ajv-based unit tests in `tests/schemas/app-manifest-v2.schema.spec.js` (or a sibling file) exercising all fixtures above against the schema.
- [ ] 4.6 Add a unit test asserting `version` reads `2.23.0`.

## 5. Verification

- [ ] 5.1 `npm test -- tests/schemas` green.
- [ ] 5.2 Confirm no existing manifest fixture in the repo fails validation after the bump (additive-only regression check).

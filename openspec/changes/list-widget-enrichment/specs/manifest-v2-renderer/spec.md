## ADDED Requirements

### Requirement: object-table accepts a declarative self-fetching source

The built-in `object-table` widget (`CnWidgetObjectTable`, delegating to `CnDataTable`) SHALL accept a declarative `source` prop `{ register, schema, filter, order, limit }` and self-fetch its rows from OpenRegister, so a fleet dashboard list surface can be declared entirely as a manifest widget entry with no bespoke component. The prop SHALL default to `null` and SHALL NOT alter behaviour when a caller instead passes `rows` (externally supplied rows always win, preserving the existing interface).

- `source.filter` SHALL be token-resolved with the shared `resolveFilterTokens` grammar already used by `type:"stat"` and `CnObjectListWidget` sources: `@today`, `@me`, `@workspace.*`, and the `?`-optional token suffix. A `?`-suffixed token that resolves to empty SHALL drop its filter clause (via `dropOptionalUnresolved`) rather than fail the fetch.
- `source.register` MAY carry an `@resolve:` sentinel; the widget SHALL pass it through unexpanded (resolution is the host's responsibility, not the widget's).
- `source.order` SHALL be forwarded as the fetch ordering and `source.limit` as the row cap.
- The widget SHALL forward the already-shipped `CnDataTable` capabilities as pass-through props: `columns` (string keys OR `{ key, label, sortable, width, cellClass, formatter, widget, format, aggregate }`), `hideHeader` + borderless compact mode, the `#footer` scoped slot `{ total, shown }`, `rowRoute` (row-click navigation), `viewAllRoute` / `viewAllLabel`, `emptyText`, and `rowIcon` (a string icon name OR a function of the row).

An app SHALL NOT hand-roll a list component when the surface it renders can be expressed by this contract.

#### Scenario: A dashboard list is declared as an object-table widget entry

- **WHEN** a manifest places an `object-table` widget whose `props.source` is `{ register: "@resolve:tenant_register", schema: "case", filter: { assignee: "@me", "status?": "@workspace.openStatus" }, order: { dueDate: "asc" }, limit: 5 }`
- **THEN** `CnWidgetObjectTable` SHALL resolve `@me` and `@workspace.openStatus` before fetching, drop the `status?` clause when `@workspace.openStatus` resolves to empty, pass `@resolve:tenant_register` through unexpanded, and render the fetched rows through `CnDataTable` with no registered custom component

#### Scenario: External rows preserve the existing pass-through interface

- **WHEN** a caller passes `rows` and `columns` to `CnWidgetObjectTable` without a `source`
- **THEN** the widget SHALL render those rows exactly as before this change, performing no self-fetch (backward compatibility)

### Requirement: Generic daysSince and daysUntil display formatters

The `cnFormatters` registry (`BUILT_IN_FORMATTERS` in `builtInFormatters.js`) SHALL provide two generic relative-day display formatters, `daysSince` and `daysUntil`, resolvable by a column's `formatter` name. They SHALL render i18n'd relative phrasing through the library's own translation function (`translate` / `translatePlural` from `@nextcloud/l10n`, app slug `nextcloud-vue`), and SHALL be safe against null / empty / unparseable input by returning the original value or an empty string rather than throwing (the existing built-in-formatter contract).

- `daysUntil(value)` SHALL express a future-oriented deadline: a value in the future renders "N days remaining", a value that is today renders "Due today", and a value in the past renders "N days overdue".
- `daysSince(value)` SHALL express elapsed time since a past date: a value in the past renders "N days ago", a value that is today renders "Today".
- Day counts SHALL use `translatePlural` so singular/plural forms are correct per locale.

No app SHALL introduce a bespoke component or a per-widget `computed` to produce these display values.

#### Scenario: A due-date column uses daysUntil instead of per-app code

- **WHEN** a column declares `{ key: "dueDate", formatter: "daysUntil" }` and `CnCellRenderer` resolves it against the injected `cnFormatters` registry
- **THEN** the cell SHALL render "N days remaining" for a future date, "Due today" for today, and "N days overdue" for a past date, with no bespoke component or column `computed`

#### Scenario: Formatters never throw on bad input

- **WHEN** `daysSince` or `daysUntil` receives `null`, `''`, or an unparseable string
- **THEN** it SHALL return an empty string (for null/empty) or the original value (for unparseable) rather than throw

### Requirement: Declarative row actions include an object-op mutation type

`CnWidgetObjectTable` SHALL accept a declarative `actions[]` prop and render it per row through the existing `CnRowActions`. Each action SHALL reuse the unified action shape and `type` discriminator dispatched by `actionsDispatcher.js` (`handler | open-modal | open-page | navigate`), applied per row. This requirement ADDS one further action type to `dispatchAction`: **`object-op`** — a declarative mutation of the row's own object.

An `object-op` action SHALL declare `{ op, values, confirm }` where `op` is `patch`, `delete`, or `create` and `values` is the verb's payload: the partial object for `patch`, the new object's properties for `create` (created against the widget's `source` register/schema), and omitted for `delete`. All verbs SHALL dispatch via the shared object store (`useObjectStore` — `saveObject` for `patch`/`create`, `deleteObject` for `delete`) against the widget's `source` register/schema. `delete` SHALL ALWAYS present a confirmation dialog before dispatch; `patch` and `create` SHALL confirm only when the action sets `confirm: true`.

The manifest SHALL declare mutation **intent only**. Authority SHALL NOT be expressed in the manifest: any authorization-shaped field on an action (e.g. `role`, `allow`) SHALL have no effect. RBAC SHALL be enforced server-side by OpenRegister per ADR-022 / ADR-023 — a forbidden mutation SHALL be rejected by the backend, and the widget SHALL surface the error without mutating local state.

#### Scenario: A row Accept action patches the row object declaratively

- **WHEN** an `object-table` row carries the action `{ id: "accept", label: "Accept", type: "object-op", op: "patch", values: { status: "accepted" } }` and the user triggers it
- **THEN** the widget SHALL call `useObjectStore.saveObject` with the row's object merged with `{ status: "accepted" }` against the widget's `source` register/schema, with no bespoke controller method or app-side write service
- **THEN** if OpenRegister rejects the write (RBAC), the widget SHALL surface the error and SHALL NOT mutate local row state

#### Scenario: delete always confirms; patch/create confirm only on opt-in

- **WHEN** an `object-op` action has `op: "delete"`
- **THEN** the widget SHALL present a confirmation dialog before calling `useObjectStore.deleteObject`, regardless of any `confirm` value
- **WHEN** an `object-op` action has `op: "patch"` or `op: "create"` without `confirm: true`
- **THEN** the widget SHALL dispatch immediately with no confirmation dialog
- **WHEN** such an action sets `confirm: true`
- **THEN** the widget SHALL present a confirmation dialog before dispatch

#### Scenario: object-op declares intent, never authority

- **WHEN** a manifest author adds a `role` or `allow` field to an `object-op` action
- **THEN** the field SHALL have no authorization effect and SHALL NOT be consulted by the widget; authority is resolved server-side by OpenRegister

### Requirement: object-op create is widget-scoped; patch and delete are row-scoped

Because `create` has no row to mutate, an `object-op` action with `op: "create"` SHALL be rendered as a widget-scoped action (in the list footer / header-actions affordance) rather than inside the per-row `CnRowActions` menu, and SHALL create a new object against the widget's `source` register/schema from the action's `values`. `object-op` actions with `op: "patch"` or `op: "delete"` SHALL be rendered per row (they mutate that row's object).

#### Scenario: A create action renders in the widget footer, not the row menu

- **WHEN** an `object-table` widget declares an `object-op` action with `op: "create"`
- **THEN** the action SHALL render as a widget-scoped affordance (footer / header-actions), not inside any row's action menu
- **THEN** triggering it SHALL call `useObjectStore.saveObject` with the action's `values` as a new object against the widget's `source` register/schema

### Requirement: Derived values are placed by kind, not computed in the widget

Values a list widget displays SHALL be sourced by where the derivation belongs. Display-only transforms — turning a stored date into "N days remaining", currency, relative dates — SHALL be `cnFormatters` registry entries named from a column's `formatter` (this change adds `daysSince` / `daysUntil`). Cross-object and derived FIELDS — an open-vs-final status joined from a related `statusType.isFinal`, a materialised `daysOverdue`, a `lastActivity` — are OUT OF SCOPE for the library: they SHALL be produced server-side by OpenRegister declarative calc (`x-openregister-calculations`, `@ref` / `@aggregate`, `materialise: true`) per ADR-031 and read by the widget as ordinary columns. A widget component SHALL NOT introduce a `computed` (or any client-side join/aggregation) to derive a cross-object value.

#### Scenario: A cross-object field is read as an ordinary column, not joined in the browser

- **WHEN** a list needs to show whether each `case` is open or final, where finality lives on the related `statusType.isFinal`
- **THEN** the widget SHALL read a materialised property produced by OpenRegister declarative calc as an ordinary column, and SHALL NOT fetch `statusType` and join it client-side
- **THEN** the human phrasing (e.g. "N days overdue") SHALL come from a `cnFormatters` display formatter, not from a widget `computed`

### Requirement: stats-block supports multi-entry declarative sources

The built-in `stats-block` widget (`CnStatsBlockWidget`) SHALL accept an optional `entries[]` prop where each entry declares its own token-resolved source and renders one KPI within a single card, so a small grouped-KPI surface (a card of 0–N related counts) is expressible as manifest config without a custom component. Each entry SHALL carry the same source contract as a `type:"stat"` widget (`register`, `schema`, `metric`, `filter` with `@today` / `@me` / `@workspace.*` tokens and `?`-optional clauses), an optional `route` deep link, an optional `variant`/`countLabel`, and an optional `hideWhenZero` flag that omits the entry when its resolved count is `0`.

This SHALL be backward-compatible: `entries` SHALL default to empty, and when it is absent the widget SHALL render exactly as today from its single `dataSource` prop (the `dataSource` interface is unchanged). When `entries` is provided, the widget SHALL self-fetch each entry's count over the same REST `/value` aggregation path the single-source widget uses.

#### Scenario: A retention summary card renders as declarative grouped stats

- **WHEN** a `stats-block` widget declares `entries` of three counts ("Expiring soon", "Review required", "Archived"), each with its own `source` (count metric + token-resolved filter), a `route`, and `hideWhenZero: true`
- **THEN** the widget SHALL self-fetch each entry's count and render the three KPIs in one card with no registered custom component
- **THEN** an entry whose count resolves to `0` SHALL be omitted from the card because `hideWhenZero` is set

#### Scenario: Single-source stats-block is unchanged

- **WHEN** a `stats-block` widget is given only a `dataSource` and no `entries`
- **THEN** the widget SHALL render its single KPI exactly as before this change (backward compatibility)

### Requirement: v2 manifest schema and compiled validator accept the new fields

The v2 manifest JSON Schema (`src/schemas/app-manifest-v2.schema.json`) SHALL accept the new declarative fields so a manifest using them validates: the `source` object shape on `object-table` widget props, the `object-op` action type with its `op` (`patch | delete | create`), `values`, and `confirm` fields, and the `entries[]` array on `stats-block` widget props. The compiled validator artifact (`validateManifestV2.compiled.js`) SHALL be regenerated from the schema via `scripts/build-validators.js` and SHALL NOT be hand-edited.

#### Scenario: A manifest using the new fields validates

- **WHEN** a v2 manifest declares an `object-table` widget with a `source`, an `object-op` row action, and a multi-entry `stats-block`
- **THEN** validation against the regenerated compiled validator SHALL pass
- **THEN** an `object-op` action whose `op` is not one of `patch | delete | create` SHALL fail validation

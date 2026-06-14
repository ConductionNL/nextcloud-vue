## ADDED Requirements

### Requirement: three-section menu dispatch

`CnAppNav` SHALL partition `manifest.menu[]` items into three sections based on `menu[].section`: `"main"` (default) renders in the top scrollable list, `"footer"` renders as plain pinned items in the `NcAppNavigation` `#footer` slot above the settings foldout, and `"settings"` renders as children inside an auto-mounted `NcAppNavigationSettings` foldout. Sorting (`order`), permission filtering, and `visibleIf` evaluation MUST happen once across all sections (`visibleItems`) before partitioning.

#### Scenario: main-section item renders in top list

- **WHEN** a manifest declares `{ id: "decisions", label: "Decisions", section: "main", route: "decisions-index", order: 10 }` and `CnAppNav` mounts
- **THEN** the item renders inside the `NcAppNavigation` `#list` slot
- **AND** it does NOT render inside the `#footer` slot
- **AND** the rendered `NcAppNavigationItem` carries `data-testid="cn-nav-entry-decisions"`

#### Scenario: missing section defaults to main

- **WHEN** a manifest declares a menu item without a `section` field
- **THEN** `CnAppNav` treats it as `section: "main"`
- **AND** the item renders in the top scrollable list

#### Scenario: footer-section item renders above settings foldout

- **WHEN** a manifest declares `{ id: "docs", label: "Documentation", section: "footer", href: "https://docs.example.org" }`
- **THEN** the item renders inside the `NcAppNavigation` `#footer` slot
- **AND** it renders ABOVE any `NcAppNavigationSettings` foldout that is also present
- **AND** the rendered list element carries class `cn-app-nav__footer-list`
- **AND** the item renders as a regular `NcAppNavigationItem` (NOT inside a foldout)

#### Scenario: settings-section item renders inside foldout

- **WHEN** a manifest declares `{ id: "app-settings", label: "App settings", section: "settings", route: "app-settings" }`
- **THEN** `CnAppNav` mounts an `NcAppNavigationSettings` block inside the `#footer` slot
- **AND** the item renders as a child `NcAppNavigationItem` INSIDE that foldout
- **AND** the foldout's trigger uses the cog icon

#### Scenario: settings foldout auto-prepends Personal settings

- **WHEN** the `NcAppNavigationSettings` foldout mounts and the manifest does NOT declare `nav.includePersonalSettings: false`
- **THEN** the first item inside the foldout is an auto-prepended `NcAppNavigationItem` labelled "Personal settings" (translated)
- **AND** clicking it invokes the injected `cnOpenUserSettings()` function
- **AND** manifest-declared `section: "settings"` items render AFTER the auto-prepended entry in declared `order`

#### Scenario: settings foldout suppresses Personal settings on opt-out

- **WHEN** the manifest declares `nav: { includePersonalSettings: false }`
- **THEN** the auto-prepended Personal-settings entry does NOT render
- **AND** the foldout still mounts when `section: "settings"` items exist
- **AND** the foldout does NOT mount when no `section: "settings"` items exist AND `includePersonalSettings` is false

#### Scenario: empty settings does not mount foldout

- **WHEN** the manifest declares no `section: "settings"` items AND no `nav.includePersonalSettings: false`
- **AND** `cnOpenUserSettings` resolves to the default no-op
- **THEN** the `NcAppNavigationSettings` foldout still mounts with the auto-prepended Personal-settings entry (so users have a discoverable surface)
- **AND** clicking Personal settings silently does nothing (the no-op default)

---

### Requirement: primary action above menu list

`CnAppNav` SHALL render an `NcAppNavigationNew` button above the menu list when a `primaryAction` is resolvable for the current route. Resolution order: (1) the current route's matching `pages[].primaryAction`, (2) `manifest.nav.primaryAction` as app-wide default. Click MUST emit `@primary-action` on `CnAppNav` with the resolved `primaryAction` block as payload.

#### Scenario: page-scoped primary action renders

- **GIVEN** the manifest declares a page `{ id: "decisions-index", primaryAction: { id: "create-decision", label: "+ New decision", icon: "Plus" } }`
- **WHEN** the current route name is `"decisions-index"`
- **THEN** `CnAppNav` renders an `NcAppNavigationNew` button above the menu list
- **AND** the button label resolves through the translator to "+ New decision"
- **AND** the button icon is the resolved MDI `Plus` component

#### Scenario: menu-root primary action as default

- **GIVEN** the manifest declares `nav: { primaryAction: { id: "create-item", label: "+ New item", icon: "Plus" } }` AND no page-level override
- **WHEN** the current route is any route in the manifest
- **THEN** `CnAppNav` renders the menu-root primary action

#### Scenario: page-scoped overrides menu-root

- **GIVEN** both `nav.primaryAction` AND a `pages[].primaryAction` for the current route are declared
- **WHEN** `CnAppNav` resolves the primary action
- **THEN** the page-scoped block wins
- **AND** the menu-root block is NOT rendered

#### Scenario: primary-action click emits event with payload

- **GIVEN** an `NcAppNavigationNew` button is rendered
- **WHEN** the user clicks it
- **THEN** `CnAppNav` emits `@primary-action` with the resolved block as payload (`{ id, label, icon, target? }`)
- **AND** the host App receives the event (`CnAppRoot` re-emits unchanged)

#### Scenario: no primary action renders nothing

- **GIVEN** neither a page-scoped nor a menu-root `primaryAction` is declared
- **WHEN** `CnAppNav` renders
- **THEN** no `NcAppNavigationNew` button renders
- **AND** the menu list sits flush against the top of the navigation as before

#### Scenario: icon defaults to Plus

- **GIVEN** a `primaryAction` block omits the `icon` field
- **WHEN** the button renders
- **THEN** the icon defaults to the MDI `Plus` component

---

### Requirement: per-item counter badge with literal and reactive binding

`CnAppNav` SHALL render an `NcCounterBubble` in each `NcAppNavigationItem`'s `#counter` slot when the item declares a `count` field. Literal numbers render as-is. The sentinel string `"auto"` resolves the count reactively from `useObjectStore().totalForType(slug)` where `slug = "${page.config.register}-${page.config.schema}"` for the entry's resolved index page. A `count` of `0`, `null`, or `undefined` SHALL render no badge.

#### Scenario: literal count renders bubble

- **GIVEN** a menu item declares `{ id: "decisions", count: 42 }`
- **WHEN** the item renders
- **THEN** an `NcCounterBubble` is rendered with content `42` inside the item's `#counter` slot

#### Scenario: reactive count resolves from store

- **GIVEN** a menu item declares `{ id: "decisions", route: "decisions-index", count: "auto" }`
- **AND** the manifest's `pages` array has `{ id: "decisions-index", type: "index", config: { register: "decisions", schema: "decision" } }`
- **AND** the object store has `totalForType("decisions-decision")` returning `17`
- **WHEN** the item renders
- **THEN** the `NcCounterBubble` renders with content `17`
- **AND** when the store value changes, the rendered count updates reactively

#### Scenario: zero count renders no badge

- **WHEN** the resolved count value is `0`
- **THEN** no `NcCounterBubble` is rendered
- **AND** the `#counter` slot remains empty

#### Scenario: auto with no matching index page renders nothing

- **GIVEN** a menu item declares `count: "auto"` AND its `route` resolves to a non-index page (or no page at all)
- **WHEN** the item renders
- **THEN** no badge is rendered
- **AND** a single `console.warn` is emitted naming the item id (so manifest authors notice the misconfiguration)

---

### Requirement: nested children with allow-collapse

`CnAppNav` SHALL render visible children (`item.children[]` filtered by permission + visibleIf) by passing `:allow-collapse="true"` and `:open="item.open ?? false"` to the parent `NcAppNavigationItem` and emitting child `NcAppNavigationItem`s inside its default slot.

#### Scenario: children render under parent

- **GIVEN** a menu item declares `{ id: "settings", children: [{ id: "general", route: "settings-general" }] }`
- **WHEN** the item renders
- **THEN** the parent `NcAppNavigationItem` receives `:allow-collapse="true"`
- **AND** the child renders inside the parent's default slot
- **AND** the child carries `data-testid="cn-nav-entry-general"`

#### Scenario: open field controls initial expansion

- **GIVEN** a menu item declares `{ id: "settings", open: true, children: [...] }`
- **WHEN** the item renders
- **THEN** the parent `NcAppNavigationItem` receives `:open="true"`
- **AND** the children are expanded on initial render

---

### Requirement: type caption renders as section divider

`CnAppNav` SHALL render menu entries with `type: "caption"` as `NcAppNavigationCaption` rather than `NcAppNavigationItem`. Caption entries use `label` as the caption text; `route`, `href`, `action`, `icon`, `count`, `children`, and `pinned` are ignored.

#### Scenario: caption renders

- **GIVEN** a menu entry `{ id: "section-header", type: "caption", label: "Settings", section: "main", order: 50 }`
- **WHEN** the item renders
- **THEN** an `NcAppNavigationCaption` with name "Settings" is rendered at order position 50
- **AND** no `NcAppNavigationItem` is rendered for that id
- **AND** the entry is not clickable

---

### Requirement: per-item pinned pass-through

`CnAppNav` SHALL forward each item's `pinned` boolean (default `false`) to the rendered `NcAppNavigationItem`'s `pinned` prop.

#### Scenario: pinned item

- **GIVEN** a menu item `{ id: "important", pinned: true }`
- **WHEN** the item renders
- **THEN** the rendered `NcAppNavigationItem` receives `:pinned="true"`

---

### Requirement: per-item actions slot pass-through

`CnAppNav` SHALL accept an `#actions-{id}` scoped slot per menu item. When the host registers content in that slot, `CnAppNav` MUST render it inside that item's `NcAppNavigationItem` `#actions` slot.

#### Scenario: per-item action slot renders

- **GIVEN** the host mounts `<CnAppNav>` with a slot `#actions-decisions` containing an `NcActionButton`
- **WHEN** the `decisions` item renders
- **THEN** the `NcAppNavigationItem`'s `#actions` slot contains the host-supplied `NcActionButton`
- **AND** items without a matching slot render no `#actions` content

---

### Requirement: search slot pass-through

`CnAppNav` SHALL expose a `#search` slot that forwards directly into `NcAppNavigation`'s `#search` slot. Hosts use it to mount `NcAppNavigationSearch`.

#### Scenario: search slot forwarded

- **GIVEN** the host mounts `<CnAppNav>` with a slot `#search` containing an `NcAppNavigationSearch`
- **WHEN** `CnAppNav` renders
- **THEN** the `NcAppNavigation` `#search` slot receives the host-supplied `NcAppNavigationSearch`
- **AND** when the host does not supply `#search`, the navigation renders no search input

---

### Requirement: backwards-compatible API surface

`CnAppNav`'s existing props (`manifest`, `translate`, `permissions`) and existing injects (`cnManifest`, `cnTranslate`, `cnOpenUserSettings`) SHALL continue to function unchanged. The existing `visibleItems` computed SHALL still be exposed (filtered + sorted across all sections) for backwards compatibility with code that reads it directly. No props or events are removed in this change.

#### Scenario: legacy visibleItems retained

- **WHEN** an external consumer reads `cnAppNavInstance.visibleItems`
- **THEN** it returns the same filtered-and-sorted array of items it did before this change
- **AND** the array contains items from all three sections

#### Scenario: standalone CnAppNav without CnAppRoot

- **GIVEN** `CnAppNav` is mounted with explicit `:manifest` + `:translate` props and no `CnAppRoot` ancestor
- **WHEN** the user clicks the auto-prepended Personal-settings entry
- **THEN** the injected `cnOpenUserSettings` resolves to the default no-op and silently does nothing
- **AND** no error is thrown

---

### Requirement: page renderer forwards parent listeners and attributes

`CnPageRenderer` SHALL forward `$listeners` and `$attrs` to every dispatched page component (the `resolvedComponent` block on the V1 render path). The renderer SHALL declare `inheritAttrs: false` so forwarded `$attrs` do not also leak onto the wrapping `<div>` element.

#### Scenario: listener bubbles from page component to host

- **GIVEN** `CnPageRenderer` dispatches a `CnDashboardPage` for the current route
- **AND** `CnDashboardPage` emits a custom event `@widget-action` with payload `{ widgetId: "foo" }`
- **WHEN** the host App registers `<CnPageRenderer @widget-action="onWidgetAction">`
- **THEN** the host's `onWidgetAction` handler fires with payload `{ widgetId: "foo" }`

#### Scenario: attribute fall-through reaches page

- **GIVEN** `CnPageRenderer` is mounted as `<CnPageRenderer data-host-context="meeting-room">`
- **WHEN** the dispatched page component renders
- **THEN** the dispatched component receives `data-host-context="meeting-room"` in its `$attrs`
- **AND** the wrapping `.cn-page-renderer` `<div>` does NOT carry that attribute (because `inheritAttrs: false`)

#### Scenario: explicit prop binding still wins

- **GIVEN** the manifest's `page.config` declares `title: "Decisions"`
- **AND** the host passes `<CnPageRenderer :title="overridden">` (a non-prop attribute on the renderer)
- **WHEN** the dispatched page renders
- **THEN** `resolvedProps.title` (`"Decisions"`) wins for the page's `title` prop
- **AND** the host attribute reaches `$attrs` but does NOT override the resolved prop

---

### Requirement: manifest schema accepts new menu fields

`validateManifest` SHALL accept manifests carrying the new fields (`section: "footer"`, `count` as number or `"auto"`, `pinned` boolean, `type: "caption"`, `nav.primaryAction`, `nav.includePersonalSettings`, `pages[].primaryAction`) without validation errors. Manifests without those fields SHALL continue to validate as before.

#### Scenario: manifest with new fields validates

- **GIVEN** a manifest declaring `menu[].section: "footer"`, `count: "auto"`, `pinned: true`, `type: "caption"`, plus `nav.primaryAction` and `pages[].primaryAction`
- **WHEN** `validateManifest(manifest)` runs
- **THEN** the result is `{ valid: true, errors: [] }`

#### Scenario: legacy manifest still validates

- **GIVEN** a manifest using only the previous fields (`section: "main" | "settings"`, no `count`, no `primaryAction`)
- **WHEN** `validateManifest(manifest)` runs
- **THEN** the result is `{ valid: true, errors: [] }`
- **AND** the manifest renders identically to its pre-change behaviour (except for the documented `section: "settings"` visual relocation)

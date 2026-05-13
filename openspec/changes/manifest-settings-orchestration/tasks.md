# Tasks: Manifest settings orchestration

## Phase 1 — Schema

- [x] Update `src/schemas/app-manifest.schema.json`:
      enrich the `pages[].config` description for `type:"settings"`
      to document the new top-level `tabs[]` sibling of `sections[]`
      (XOR) and the new `widget.type === "component"` discriminator
      with `componentName`.
- [x] Add a description note that one of `sections | tabs` MUST be
      set, never both.
- [x] Do NOT bump the schema's top-level `version` — this is purely
      additive.

## Phase 2 — Validator

- [x] Update `src/utils/validateManifest.js`'s `validateTypeConfig`
      `'settings'` branch:
      - When `cfg.tabs` is an array, validate it instead of (XOR)
        `cfg.sections`. When BOTH are set, emit
        `pages[N].config: must declare exactly one of sections | tabs`.
      - Each tab MUST be an object with `id: string` (non-empty),
        `label: string` (non-empty), and `sections: array` (non-empty).
      - Tab IDs MUST be unique within the page (warn-not-error
        suffices for v1).
      - Within each tab's `sections[]`, run the EXACT same per-section
        rules the flat case runs (`fields | component | widgets`
        XOR, etc.) — extract a helper so both call sites share code.
      - For each section's `widgets[]`, when `widget.type ===
        "component"`, `widget.componentName` MUST be a non-empty
        string. (Other widget types ignore `componentName`.)
- [x] Add new test cases to
      `tests/schemas/app-manifest.schema.spec.js`:
      - `tabs`-only valid manifest
      - `tabs` + `sections` set together → rejected
      - tab with empty `id` → rejected
      - tab with empty `label` → rejected
      - tab with empty `sections[]` → rejected
      - tab with mixed-body section → rejected (delegated to shared rule)
      - widget `{ type: "component" }` with no `componentName` → rejected
      - widget `{ type: "component", componentName: "X" }` → valid
      - bare-fields, rich-sections, and `tabs` manifests from the
        existing fixtures still validate identically (back-compat)

## Phase 3 — Component

- [x] Update `src/components/CnSettingsPage/CnSettingsPage.vue`:
      - Add a `tabs` prop (Array, default `[]`) parallel to
        `sections`.
      - Add an `initialTab` prop (String, default `''`); when empty
        AND `tabs[]` is non-empty, the first tab is active.
      - Track `activeTabId` in component state.
      - When `tabs[]` is non-empty, render a tab strip (use
        `NcAppNavigationItem`-style horizontal tab strip; the
        Nextcloud `vue` library exposes a tab pattern). Each tab
        button is a `<button>` with role="tab" and aria-controls
        pointing at the tab panel below. Use Nextcloud CSS variables
        only — no hardcoded colors or spacing.
      - The active tab's `sections[]` flows into the existing
        section renderer (the same `<CnSettingsCard v-for>` block
        the flat case uses). Extract the section rendering into an
        in-component computed `activeSections` so the template
        doesn't have to branch.
      - Add `'component'` to the built-in widget registry. Its
        resolver does not return a fixed component — instead, it
        resolves `widget.componentName` against
        `effectiveCustomComponents`. A miss produces the same
        console.warn behavior as today's unresolved fallback.
      - Document the new section-of-`tabs[]` shape and the new
        `'component'` widget discriminator in the JSDoc.
- [x] Emit a `@tab-change` event when the user switches tabs
      (`payload: { tabId, tabIndex }`) so the consumer router can
      react if it wants to.

## Phase 4 — Tests

- [x] Add `tests/components/CnSettingsPageTabs.spec.js`:
      - Single-tab manifest renders one tab button + its sections.
      - Multi-tab manifest renders one tab button per tab.
      - First tab is active by default.
      - `initialTab` prop selects the named tab on mount.
      - Clicking a tab button activates it.
      - Tab switch emits `@tab-change` with `{ tabId, tabIndex }`.
      - A tab's bare-fields section renders inputs (re-uses the flat
        renderer).
      - A tab's `widgets[]` section with built-in `version-info`
        renders `CnVersionInfoCard`.
      - A tab's `widgets[]` section with `{ type: "component",
        componentName: "X" }` resolves via customComponents.
      - An unknown `componentName` warns and skips (does not throw).
      - Unknown `componentName` does not break sibling widgets in
        the same section.
- [x] Update `tests/components/CnSettingsPageRichSections.spec.js`
      with one extra test verifying back-compat: a manifest with
      flat `sections[]` and no `tabs[]` renders identically to the
      existing rich-sections behavior.
- [x] Add a fixture
      `tests/fixtures/manifest-settings-tabs.json` exercising every
      tab + body-kind combination (bare-fields tab, widgets-builtin
      tab, widgets-component tab, mixed-body tab) and reference it
      from the new schema tests.

## Phase 5 — Docs

- [x] Update `docs/components/cn-settings-page.md`:
      - New "Tabs orchestration" section documenting the
        `tabs: [{ id, label, sections }]` shape.
      - Extend the "Built-in widget types" table with the new
        `component` discriminator row.
      - Document the `@tab-change` event.
- [x] Update `docs/migrating-to-manifest.md`:
      - Add a "Multi-tab admin pages" example mirroring
        softwarecatalog's eight-tab shape.
      - Add a "Custom component widget" example mirroring procest's
        `WorkflowEditor`.
- [x] Run `npm run check:docs` — must pass.

## Phase 6 — Verification

- [x] Run `npm test` — all suites green (existing + new).
- [x] Run `npx eslint` on changed files — passes.
- [x] Stage + commit the change. Do NOT push from this task —
      Phase 3 of the orchestration brief opens the lib PR. Do NOT
      add `Co-Authored-By` trailers.

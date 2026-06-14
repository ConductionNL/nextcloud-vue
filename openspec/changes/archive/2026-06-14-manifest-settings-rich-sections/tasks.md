# Tasks: Manifest settings rich sections

## Phase 1 — Schema

- [x] Update `src/schemas/app-manifest.schema.json`:
      enrich the `pages[].config` description for `type: "settings"` to
      cover the new section shapes (`fields | component | widgets`).
      Do NOT bump the schema's top-level `version` — this is purely
      additive.
- [x] Document the built-in widget types (`version-info`,
      `register-mapping`) in the same schema description so manifest
      authors can find them without reading the code.

## Phase 2 — Validator

- [x] Update `src/utils/validateManifest.js`'s `validateTypeConfig`
      `'settings'` branch:
      - Each section MUST declare exactly one of `fields | component |
        widgets`. Mixed bodies are rejected with a clear path
        (`pages[N].config.sections[K]: must declare exactly one of
        fields | component | widgets`).
      - When `component` is set, it MUST be a non-empty string.
      - When `widgets` is set, it MUST be a non-empty array, and each
        entry MUST have `type: string`.
      - Bare `fields` sections (the existing shape) continue passing
        the existing rules unchanged.
- [x] Add at least 4 new test cases to
      `tests/schemas/app-manifest.schema.spec.js` exercising the new
      validator rules: bare-fields-still-valid, component-only-valid,
      widgets-only-valid, mixed-body-rejected. (Added 11 new cases.)

## Phase 3 — Component

- [x] Update `src/components/CnSettingsPage/CnSettingsPage.vue`:
      - Add an `inject: { cnCustomComponents: { default: () => ({}) } }`
        block (mirrors CnPageRenderer).
      - Add a `customComponents` prop that overrides the inject for
        explicit-mount usage.
      - Render the three section flavors:
        - bare `fields[]` → unchanged behavior.
        - `component` → resolve via the effective customComponents
          registry; v-bind `section.props`; warn + skip on miss.
        - `widgets[]` → for each entry, look up `widget.type` in the
          built-in widget map (`version-info` → `CnVersionInfoCard`,
          `register-mapping` → `CnRegisterMapping`) FIRST, then in
          customComponents; v-bind `widget.props`; emit
          `@widget-event` with `{ widgetType, widgetIndex,
          sectionIndex, name, args }` when the widget emits.
      - Document the lookup order in the component's JSDoc.
- [x] Forward built-in widget events through the page's
      `@widget-event` so consumers wire one handler at the page level.
      This keeps the manifest declarative (no inline JS) and keeps the
      consumer-side coupling visible at the CnAppRoot mount point.
      (Implemented via internal `CnSettingsWidgetMount` helper that
      patches the inner widget's `$emit` — Vue 2 Proxy + `v-on=` does
      not iterate Proxy traps.)
- [x] `headerComponent`, `actionsComponent`, and the generic page
      `slots` map continue to work unchanged.

## Phase 4 — Tests

- [x] Add `tests/components/CnSettingsPageRichSections.spec.js`:
      - Bare-fields section still renders inputs (sanity).
      - `component`-only section mounts the registered component +
        passes `props`.
      - `widgets`-only section with built-in `version-info`
        renders `CnVersionInfoCard`.
      - `widgets`-only section with built-in `register-mapping`
        renders `CnRegisterMapping`.
      - `widgets`-only section with a registry-name (not in built-ins)
        falls back to `customComponents`.
      - Mixed manifest with a bare-fields section, a component-only
        section, and a widgets-only section — all three render in order.
      - `@widget-event` emits `{ widgetType, name, args }` when a
        built-in widget emits an event.
      - Unknown widget type warns and skips (does not throw).
      - explicit `customComponents` prop wins over injected
        `cnCustomComponents`; falls back to inject when no prop.
- [x] Update `tests/components/CnSettingsPage.spec.js`:
      Existing 8 tests continue to pass unchanged — back-compat
      regression confirmed by the rich-sections spec's first test
      (`REQ-MSRS-5: bare fields[] section still renders inputs`).
- [x] Add a fixture `tests/fixtures/manifest-settings-rich.json`
      exercising every flavor — bare-fields, component, widgets-builtin,
      widgets-custom, mixed — and reference it from the new schema
      tests.

## Phase 5 — Docs

- [x] Update `docs/components/cn-settings-page.md`:
      - Extend the "Section schema" block with the new keys.
      - Add a "Built-in widget types" table.
      - Add a "Custom-fallback notes" entry on widget event wiring
        via `@widget-event`.
- [x] Update `docs/migrating-to-manifest.md`:
      - Add a "Rich settings sections" example showing a manifest with
        all three flavors.
      - Add a "When to use which body kind" decision tree mirroring
        the design rule.
- [x] Run `npm run check:docs` — passes with all 70 component docs
      covered.

## Phase 6 — Verification

- [x] Run `npm test` — 32 suites / 524 tests pass (existing + new).
- [x] Run `npm run check:docs` — passes.
- [x] Run `npx eslint` on changed files — passes.
- [x] Stage + commit the change. Do NOT push. Do NOT add
      `Co-Authored-By` trailers.

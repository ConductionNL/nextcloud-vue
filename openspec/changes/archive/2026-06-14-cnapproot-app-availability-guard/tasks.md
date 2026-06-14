# Tasks: CnAppRoot app-availability guard

## Phase 1 — package.json housekeeping

- [x] Move `@nextcloud/capabilities` from `dependencies` to
      `peerDependencies` (same major-version range, `^1.2.1`).
      Matches the rest of the `@nextcloud/*` family.

## Phase 2 — CnAppRoot prop + capabilities check

- [x] Add a `requiresApps` prop to `CnAppRoot.vue`:
      `{ type: Array, default: () => ['openregister'] }`. JSDoc
      explains the always-on default and the `[]` opt-out.
- [x] Add `data()` returning
      `{ capabilitiesLoading: true, missingApps: [], guardError: null }`.
      Initial `capabilitiesLoading: true` is overridden when
      `requiresApps` is empty (mounted hook short-circuits).
- [x] Add a `mounted()` hook:
  - When `this.requiresApps.length === 0`, set
    `capabilitiesLoading = false` synchronously and return.
  - Otherwise call `getCapabilities()` from
    `@nextcloud/capabilities`, derive
    `missingApps = requiresApps.filter(id => !(id in capabilities))`,
    set `capabilitiesLoading = false`.
  - Wrap in try/catch. On error, log via `console.warn`, set
    `guardError = err`, leave `missingApps = []` (fall through
    to renderer), and set `capabilitiesLoading = false`.

## Phase 3 — Template wiring

- [x] Add a render branch BEFORE the existing `phase === 'loading'`
      check:
  - When `capabilitiesLoading` is true, render a
    `<NcLoadingIcon :size="32" />` centered in the NcContent.
  - When `missingApps.length > 0`, render
    `<slot name="or-missing" :missing-apps="missingApps">` with
    a default `<NcEmptyContent>` containing the OpenRegister
    icon, i18n title/description, and a primary action linking
    to `/index.php/settings/apps/integration/openregister`.
- [x] Import `NcEmptyContent`, `NcLoadingIcon` from
      `@nextcloud/vue` and register in `components`.
- [x] Use the existing `translate` prop for i18n strings
      (`this.translate('app-availability.title')` etc.), so the
      consumer's `t()` is the canonical source.

## Phase 4 — Tests

- [x] Update `tests/components/CnAppRoot.spec.js`:
  - Add `requires-apps` describe block with cases:
    - Renders renderer when capabilities include openregister
      (default `requiresApps`).
    - Renders empty state when capabilities don't include
      openregister.
    - Renders empty state when ANY required app is missing
      (multi-app future-proofing).
    - Loading state visible during the check.
    - `:requires-apps="[]"` skips the guard and renders
      immediately.
    - Custom `#or-missing` slot wins over the default empty
      state.
    - Network failure on `getCapabilities()` doesn't crash —
      falls through to renderer.
  - Existing tests still pass (capabilities mock already in
    place; existing tests already mock-return `{}` or
    `{ openregister: {} }` as appropriate).

## Phase 5 — Docs

- [x] Update `docs/migrating-to-manifest.md` — add an
      "App-availability guard" section under the Tier 4 / CnAppRoot
      block explaining the always-on default, the `[]` opt-out,
      and the `#or-missing` slot.
- [x] Update `docs/architecture/schemas-and-registers.md` — add an
      "App-availability guard (opt-out)" section that mirrors the
      migrating-to-manifest copy but framed for the
      architecture-level reader.
- [x] JSDoc on the new prop + slot in CnAppRoot.vue.

## Phase 6 — Gates

- [x] `npx jest tests/components/CnAppRoot.spec.js` — green.
- [x] `npx jest` — full suite green.
- [x] `cd docusaurus && npm run prebuild:docs` — green.
- [x] `npm run check:jsdoc` — green (run
      `npm run jsdoc-baselines:update` if it ratchets on the new
      prop/slot).
- [x] `npm run lint` — green.

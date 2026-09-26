# Tasks: guardian-portal-surface-pattern

Spec ref: `openspec/changes/guardian-portal-surface-pattern/specs/guardian-portal-surface/spec.md`
(new capability — REQ-GPS-1..6).

## 1. Component

- [x] 1.1 Create `src/components/CnGuardianHome/CnGuardianHome.vue` +
      `index.js` barrel. Options API (per design rule), EUPL-1.2 SPDX
      header, full JSDoc on every prop/event/slot.
- [x] 1.2 Props: `children` (Array, default `[]`), `activeChildId`
      (String|Number, default `null`, `v-model`-bindable),
      `showAbsenceAction` (Boolean, default `true`), `absenceLabel` /
      `feedLabel` / `agendaLabel` / `consentLabel` / `switcherLabel` /
      `sectionsLabel` (String overrides, default `''`).
- [x] 1.3 Children switcher: `role="radiogroup"` of `NcCheckboxRadioSwitch`
      (`type="radio"`), one per child, checked state driven by
      `activeChildId`; renders an avatar image when `child.avatarUrl` is set.
- [x] 1.4 Auto-select the first child (emit `update:activeChildId`) when
      `activeChildId` is unset or names a child no longer in `children`;
      re-evaluate whenever `children` changes (covers an async fetch).
- [x] 1.5 "Report absence" `NcButton` in the header (hidden when
      `showAbsenceAction` is `false`), emitting `report-absence` with the
      active child object.
- [x] 1.6 Three `CnTab` sections (feed / agenda / consent) inside a
      `CnTabs` strip, each exposing a scoped slot (`feed`, `agenda`,
      `consent`) bound to `{ child: activeChild }`, with a generic
      "not configured yet" fallback when the host supplies nothing.
- [x] 1.7 `empty` slot (default: `NcEmptyContent`) for the no-children
      state; `header-extra` slot for host-supplied header content.

## 2. Docs

- [x] 2.1 `docs/components/cn-guardian-home.md` — usage example, props
      table, slots table, events table; satisfies `check:docs`'s
      prop/slot accuracy check.
- [x] 2.2 Barrel exports: `src/components/index.js` and `src/index.js`
      (alphabetical position, between `CnGraphCanvas` and `CnHeaderWidget`
      in `src/index.js`'s sorted list).

## 3. Tests

- [x] 3.1 `tests/components/CnGuardianHome.spec.js` — empty state (default
      + `empty` slot override), auto-select-first-child (unset and
      stale-id cases), switcher rendering + checked state + picking emits
      `update:activeChildId`, avatar rendering, `report-absence` emission
      + payload, `showAbsenceAction` hides the button, section titles
      (default + overridden), scoped-slot `child` binding on all three
      sections, unconfigured-section fallback.

## 4. Verification

- [x] 4.1 `openspec validate guardian-portal-surface-pattern --strict`
- [x] 4.2 Diff-scoped: `npx eslint` on every touched/new file;
      `npx jest tests/components/CnGuardianHome.spec.js`
- [x] 4.3 Full pre-push: `npm run lint`, `npm test`, `npm run build`
      (each via the lane's `with-slot.sh` semaphore)

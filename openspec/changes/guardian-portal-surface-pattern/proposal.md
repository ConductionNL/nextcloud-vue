---
kind: code
---

## Why

Every corpus competitor examined in learniq round 1 — including both
open-source ones — ships a distinct, first-class parent/guardian-facing
surface: a place a parent lands that shows their children, a feed, an
absence/agenda entry point, and consent controls. learniq and portaliq
build guardian surfaces ad hoc today, per app, with no shared component
(`market-intelligence/learniq/tier-b-and-sibling.md` section 3, "Platform
requests": *"a first-class guardian or parent surface pattern... every
corpus competitor... has a distinct parent-facing UI"* — the M3(b)
design-system request this round surfaced). Building that pattern once in
the shared library, the way `CnAdminSettingsShell` already gives every app
a common settings-page shell instead of each rolling its own, means
learniq's `portal-contribution-guardian-audiences` change and portaliq's
`portal-parent` surface can both compose from the same primitive instead
of two more bespoke builds.

## What Changes

- Add `CnGuardianHome` (`src/components/CnGuardianHome/`): a layout-only
  composition built entirely from existing primitives —
  `NcCheckboxRadioSwitch` (children switcher, `role="radiogroup"`, the
  same pattern `CnWorkspaceFilterWidget` already uses), `CnTabs`/`CnTab`
  (the feed / agenda / consent-settings sections — panels stay mounted
  when inactive, so a host widget's own fetch never refires on switch),
  `NcButton` (the "report absence" entry point), and `NcEmptyContent`
  (the no-children-yet state). No new dependency.
- The component owns ONLY the shell: which child is active, the section
  tabs, and the "report absence" click. It fetches nothing and knows
  nothing about OpenRegister, `PortalContributionProvider`, or any app's
  data model — `children` is plain data, and the feed/agenda/consent
  sections are scoped slots (`{ child }`) the host fills with its own
  data-bound widgets (e.g. a `CnObjectListWidget` for the feed).
- `activeChildId` is `v-model`-bindable and self-defaults to the first
  child when unset or stale (covers both "host doesn't manage selection"
  and "children arrives async"), so no host has to hand-roll that logic.
- New `guardian-portal-surface` OpenSpec capability (none existed) plus
  `docs/components/cn-guardian-home.md` and a full test suite
  (`tests/components/CnGuardianHome.spec.js`).

## Capabilities

### New Capabilities

- `guardian-portal-surface`: a shared, layout-only guardian/parent portal
  shell (children switcher, feed/agenda/consent sections, absence entry
  point) that any Conduction app composes from with its own data-bound
  widgets.

### Modified Capabilities
<!-- none -->

## Impact

- **Code**: `src/components/CnGuardianHome/CnGuardianHome.vue` +
  `index.js` (new), `src/components/index.js` + `src/index.js` (barrel
  exports), `docs/components/cn-guardian-home.md` (new).
- **Tests**: `tests/components/CnGuardianHome.spec.js` (new, 12 cases).
- **Consumers**: learniq's `portal-contribution-guardian-audiences` and
  portaliq's `portal-parent` / `portal-contribution` surfaces are the
  intended first adopters (not built here — this ships the shared
  primitive only, per the design-system request's own framing).
- **No breaking changes**: purely additive (one new component, one new
  export). No dependency added — every piece is either an existing
  `@nextcloud/vue` component already a peer dependency, or an existing
  internal primitive (`CnTabs`/`CnTab`).
- **Backward compatible with the design rule**: Options API only (per
  `openspec/config.yaml`'s design rules); the internal use of
  `CnTabs`/`CnTab` (which use Composition API under the hood) is
  unchanged from how every other consumer of that pair already uses it.

## Rollback Strategy

Purely additive: removing the two barrel-export lines and deleting
`src/components/CnGuardianHome/` restores the previous state. No app
depends on this yet (it ships ahead of its first consumer, per the
design-system request).

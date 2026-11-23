# CnGuardianHome

A first-class guardian/parent portal surface pattern, composed entirely
from existing library primitives (`NcCheckboxRadioSwitch`, `CnTabs`/`CnTab`,
`NcButton`, `NcEmptyContent`). No new dependency.

Every corpus competitor examined in learniq round 1 — including both
open-source ones — ships a distinct parent-facing UI. learniq and portaliq
currently build guardian surfaces ad hoc, per app, with no shared component
(the M3(b) design-system request this component answers). `CnGuardianHome`
is that shared shell: a children switcher, a "report absence" entry point,
and three sections (feed, agenda, consent settings).

## When to use

Mount `CnGuardianHome` wherever a host app renders a guardian's own
"home" view: a parent portal landing page, a dashboard tab for guardians,
or a dedicated route. The component owns only the layout — it fetches
nothing and knows nothing about OpenRegister, `PortalContributionProvider`,
or any app's data model. Supply `children` as plain data (id, name,
optional avatar) and fill the three section slots with your own
data-bound widgets, for example a `CnObjectListWidget` for the feed and a
calendar component for the agenda.

```vue
<CnGuardianHome
	:children="children"
	v-model:activeChildId="activeChildId"
	@report-absence="openAbsenceForm">
	<template #feed="{ child }">
		<CnObjectListWidget :content="feedContentFor(child)" />
	</template>
	<template #agenda="{ child }">
		<MyAgendaWidget :child-id="child.id" />
	</template>
	<template #consent="{ child }">
		<MyConsentSettings :child-id="child.id" />
	</template>
</CnGuardianHome>
```

## Selecting a child

`activeChildId` supports `v-model`. When it is unset, or names a child no
longer present in `children`, the component falls back to the first child
in the list and emits `update:activeChildId` — a guardian with one child
never has to pick, and a host that does not manage selection at all still
gets a sensible default. This also covers `children` arriving after an
async fetch: the fallback re-evaluates whenever the `children` prop changes.

## Sections stay mounted

The feed / agenda / consent panels are built on `CnTab`, which keeps an
inactive panel in the DOM (hidden, not destroyed) rather than tearing it
down. Switching between sections never re-fires a host widget's own
`mounted()` fetch.

## Reference

- Spec: `openspec/changes/guardian-portal-surface-pattern/specs/guardian-portal-surface/spec.md`
- Implementation: [src/components/CnGuardianHome/CnGuardianHome.vue](../../src/components/CnGuardianHome/CnGuardianHome.vue)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | Array | `[]` | The guardian's children. Each entry should carry `id` and `name`; `avatarUrl` is optional. |
| `activeChildId` | String\|Number | `null` | The selected child's `id` (`v-model`-bindable). Falls back to the first entry in `children` when unset or stale. |
| `showAbsenceAction` | Boolean | `true` | Whether the "report absence" entry point renders in the header. |
| `absenceLabel` | String | `''` | Override for the "report absence" button label. |
| `feedLabel` | String | `''` | Override for the feed section's tab title. |
| `agendaLabel` | String | `''` | Override for the agenda section's tab title. |
| `consentLabel` | String | `''` | Override for the consent-settings section's tab title. |
| `switcherLabel` | String | `''` | Accessible name for the children switcher (`role="radiogroup"`). |
| `sectionsLabel` | String | `''` | Accessible name for the feed/agenda/consent tab strip. |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `empty` | — | Overrides the "no children" empty state. |
| `header-extra` | — | Extra content rendered at the right of the header, before the "report absence" button. |
| `feed` | `{ child }` | The active child's feed. |
| `agenda` | `{ child }` | The active child's agenda/calendar. |
| `consent` | `{ child }` | The active child's consent settings. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:activeChildId` | `string\|number` | The selected child changed, from the switcher or from the auto-selected-first-child fallback. |
| `report-absence` | `object` (the active child) | The guardian clicked "report absence". |

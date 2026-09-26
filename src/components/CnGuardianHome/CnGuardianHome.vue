<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-guardian-home" data-testid="cn-guardian-home">
		<div v-if="children.length === 0" class="cn-guardian-home__empty">
			<!-- @slot empty Overrides the "no children" empty state. -->
			<slot name="empty">
				<NcEmptyContent :name="noChildrenTitle" :description="noChildrenDescription">
					<template #icon>
						<AccountChildOutline :size="48" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<template v-else>
			<div class="cn-guardian-home__header">
				<ul class="cn-guardian-home__switcher"
					role="radiogroup"
					:aria-label="switcherLabel"
					data-testid="cn-guardian-home-switcher">
					<li v-for="child in children" :key="String(child.id)" class="cn-guardian-home__switcher-item">
						<NcCheckboxRadioSwitch
							type="radio"
							name="cn-guardian-home-child"
							:modelValue="isActiveChild(child) ? String(child.id) : ''"
							:value="String(child.id)"
							:data-testid="`cn-guardian-home-child-${child.id}`"
							@update:modelValue="selectChild(child)">
							<img
								v-if="child.avatarUrl"
								:src="child.avatarUrl"
								alt=""
								class="cn-guardian-home__avatar">
							{{ child.name }}
						</NcCheckboxRadioSwitch>
					</li>
				</ul>

				<div class="cn-guardian-home__header-spacer" />

				<!-- @slot header-extra Extra content rendered at the right of the header, before the "report absence" button. Not scoped. -->
				<slot name="header-extra" />

				<NcButton
					v-if="showAbsenceAction"
					variant="secondary"
					data-testid="cn-guardian-home-report-absence"
					@click="onReportAbsence">
					<template #icon>
						<CalendarRemoveOutline :size="20" />
					</template>
					{{ resolvedAbsenceLabel }}
				</NcButton>
			</div>

			<CnTabs :ariaLabel="sectionsLabel" class="cn-guardian-home__sections">
				<CnTab :title="resolvedFeedLabel" data-testid="cn-guardian-home-feed">
					<!-- @slot feed The active child's feed. Scoped with the active child object. -->
					<!-- @binding {object} child The active child. -->
					<slot name="feed" :child="activeChild">
						<p class="cn-guardian-home__unconfigured">
							{{ unconfiguredLabel }}
						</p>
					</slot>
				</CnTab>
				<CnTab :title="resolvedAgendaLabel" data-testid="cn-guardian-home-agenda">
					<!-- @slot agenda The active child's agenda/calendar. Scoped with the active child object. -->
					<!-- @binding {object} child The active child. -->
					<slot name="agenda" :child="activeChild">
						<p class="cn-guardian-home__unconfigured">
							{{ unconfiguredLabel }}
						</p>
					</slot>
				</CnTab>
				<CnTab :title="resolvedConsentLabel" data-testid="cn-guardian-home-consent">
					<!-- @slot consent The active child's consent settings. Scoped with the active child object. -->
					<!-- @binding {object} child The active child. -->
					<slot name="consent" :child="activeChild">
						<p class="cn-guardian-home__unconfigured">
							{{ unconfiguredLabel }}
						</p>
					</slot>
				</CnTab>
			</CnTabs>
		</template>
	</div>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnGuardianHome — a first-class guardian/parent portal surface pattern,
 * composed entirely from existing library primitives (`NcCheckboxRadioSwitch`,
 * `CnTabs`/`CnTab`, `NcButton`, `NcEmptyContent`). No new dependency.
 *
 * Every corpus competitor examined in learniq round 1 (including both
 * open-source ones) ships a distinct parent-facing UI; learniq and portaliq
 * currently build guardian surfaces ad hoc, per app, with no shared
 * component (M3(b) design-system request). This is that shared shell.
 *
 * The component owns ONLY the guardian-facing layout: a children switcher,
 * a "report absence" entry point, and three sections (feed / agenda /
 * consent settings). It fetches nothing and knows nothing about
 * OpenRegister, PortalContributionProvider, or any app's data model — the
 * host app supplies `children` as plain data and fills the three section
 * slots with its own data-bound widgets (e.g. a `CnObjectListWidget` for
 * the feed, a calendar component for the agenda). This mirrors how
 * `CnAdminSettingsShell` composes a settings page from primitives without
 * owning any app's settings schema.
 *
 * ## Selecting a child
 *
 * `activeChildId` supports `v-model`. When unset (or set to a child id no
 * longer present in `children`), the component falls back to the first
 * child in the list — a guardian with one child never sees an empty
 * switcher state, and a host that does not manage selection at all still
 * gets a sensible default.
 *
 * ## Sections stay mounted
 *
 * Feed / agenda / consent panels use `CnTab`, which keeps inactive panels
 * in the DOM (hidden, not destroyed) — switching tabs never re-fires a
 * host widget's own `mounted()` fetch.
 *
 * Spec: `openspec/changes/guardian-portal-surface-pattern/specs/guardian-portal-surface/spec.md`.
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcEmptyContent } from '@nextcloud/vue'
import AccountChildOutline from 'vue-material-design-icons/AccountChildOutline.vue'
import CalendarRemoveOutline from 'vue-material-design-icons/CalendarRemoveOutline.vue'
import { CnTab, CnTabs } from '../CnTabs/index.js'

export default {
	name: 'CnGuardianHome',

	components: {
		NcButton,
		NcCheckboxRadioSwitch,
		NcEmptyContent,
		AccountChildOutline,
		CalendarRemoveOutline,
		CnTabs,
		CnTab,
	},

	props: {
		/**
		 * The guardian's children. Each entry SHOULD carry `id` and `name`;
		 * `avatarUrl` is optional (an initials-only switch item renders
		 * without one). This is plain data — the host app resolves it from
		 * whatever OpenRegister register/schema (or other source) models a
		 * "child" in that app.
		 *
		 * @type {Array<{id: (string|number), name: string, avatarUrl: ?string}>}
		 */
		children: {
			type: Array,
			default: () => [],
		},

		/**
		 * The selected child's `id` (`v-model`-bindable as `activeChildId`).
		 * Falls back to the first entry in `children` when unset or when it
		 * no longer names a present child.
		 *
		 * @type {(string|number|null)}
		 */
		activeChildId: {
			type: [String, Number],
			default: null,
		},

		/** Whether the "report absence" entry point renders in the header. */
		showAbsenceAction: {
			type: Boolean,
			default: true,
		},

		/** Override for the "report absence" button label. */
		absenceLabel: {
			type: String,
			default: '',
		},

		/** Override for the feed section's tab title. */
		feedLabel: {
			type: String,
			default: '',
		},

		/** Override for the agenda section's tab title. */
		agendaLabel: {
			type: String,
			default: '',
		},

		/** Override for the consent-settings section's tab title. */
		consentLabel: {
			type: String,
			default: '',
		},

		/** Accessible name for the children switcher (`role="radiogroup"`). */
		switcherLabel: {
			type: String,
			default: '',
		},

		/** Accessible name for the feed/agenda/consent tab strip. */
		sectionsLabel: {
			type: String,
			default: '',
		},
	},

	emits: [
		/**
		 * The selected child changed, either from the switcher or from the
		 * auto-selected-first-child fallback. Payload: the new `activeChildId`.
		 *
		 * @event update:activeChildId
		 */
		'update:activeChildId',

		/**
		 * The guardian clicked "report absence". Payload: the active child
		 * object (not just its id), since the host's absence form needs the
		 * child's display name too.
		 *
		 * @event report-absence
		 */
		'report-absence',
	],

	computed: {
		/**
		 * The active child object — the one named by `activeChildId`, or the
		 * first child when `activeChildId` is unset or stale.
		 *
		 * @return {object|null}
		 */
		activeChild() {
			if (this.children.length === 0) {
				return null
			}
			const match = this.children.find((child) => String(child.id) === String(this.activeChildId))
			return match || this.children[0]
		},

		resolvedAbsenceLabel() {
			return this.absenceLabel || t('nextcloud-vue', 'Report absence')
		},

		resolvedFeedLabel() {
			return this.feedLabel || t('nextcloud-vue', 'Feed')
		},

		resolvedAgendaLabel() {
			return this.agendaLabel || t('nextcloud-vue', 'Agenda')
		},

		resolvedConsentLabel() {
			return this.consentLabel || t('nextcloud-vue', 'Consent settings')
		},

		noChildrenTitle() {
			return t('nextcloud-vue', 'No children linked to your account yet')
		},

		noChildrenDescription() {
			return t('nextcloud-vue', 'Once a child is linked to your account, their feed, agenda, and consent settings appear here.')
		},

		unconfiguredLabel() {
			return t('nextcloud-vue', 'This app has not filled in this section yet.')
		},
	},

	watch: {
		// A host that never sets `activeChildId` (or fetches `children`
		// asynchronously, so the prop starts empty) still ends up with a
		// real selection instead of the switcher showing nothing checked.
		children: {
			immediate: true,
			handler(list) {
				if (list.length === 0) {
					return
				}
				const stillPresent = list.some((child) => String(child.id) === String(this.activeChildId))
				if (!stillPresent) {
					this.$emit('update:activeChildId', list[0].id)
				}
			},
		},
	},

	methods: {
		/**
		 * Whether `child` is the currently active one.
		 *
		 * @param {object} child A `children` entry.
		 * @return {boolean}
		 */
		isActiveChild(child) {
			return this.activeChild !== null && String(this.activeChild.id) === String(child.id)
		},

		/**
		 * Select a child from the switcher.
		 *
		 * @param {object} child The chosen `children` entry.
		 * @return {void}
		 */
		selectChild(child) {
			if (this.isActiveChild(child)) {
				return
			}
			this.$emit('update:activeChildId', child.id)
		},

		/**
		 * Handle the "report absence" button.
		 *
		 * @return {void}
		 */
		onReportAbsence() {
			if (!this.activeChild) {
				return
			}
			this.$emit('report-absence', this.activeChild)
		},
	},
}
</script>

<style scoped>
.cn-guardian-home__header {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
	margin-bottom: 12px;
}

.cn-guardian-home__header-spacer {
	flex: 1 1 auto;
}

.cn-guardian-home__switcher {
	display: flex;
	align-items: center;
	gap: 4px;
	flex-wrap: wrap;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-guardian-home__switcher-item {
	display: flex;
}

.cn-guardian-home__avatar {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	object-fit: cover;
	margin-inline-end: 6px;
	vertical-align: middle;
}

.cn-guardian-home__unconfigured {
	color: var(--color-text-maxcontrast);
	padding: 12px 0;
}
</style>

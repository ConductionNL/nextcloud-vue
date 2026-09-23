<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: AGPL-3.0-or-later
  -->

<template>
	<!-- Dropdown mode: a single NcSelect (multi or single) instead of the chip strip. -->
	<div
		v-if="mode === 'dropdown'"
		class="cn-quick-filter-bar cn-quick-filter-bar--dropdown"
		:class="{ 'cn-quick-filter-bar--inline': inline }">
		<NcSelect
			:modelValue="dropdownValue"
			:options="dropdownOptions"
			:multiple="multiple"
			:keepOpen="multiple"
			:clearable="true"
			label="label"
			class="cn-quick-filter-bar__select"
			:inputLabel="selectLabel"
			:aria-label-combobox="selectLabel"
			:placeholder="placeholder || selectLabel"
			@update:modelValue="onSelectInput" />
	</div>
	<!-- Chips mode (default): the clickable tab strip. -->
	<div v-else
		class="cn-quick-filter-bar"
		:class="{ 'cn-quick-filter-bar--inline': inline }">
		<!-- The tablist holds ONLY tabs: the overflow chip is a sibling, not a
		     child, because a role="tablist" may not contain a menu button. -->
		<div class="cn-quick-filter-bar__tabs" role="tablist">
			<button
				v-for="entry in visibleEntries"
				:key="entry.tab.label + ':' + entry.index"
				type="button"
				role="tab"
				:aria-selected="isChipActive(entry.index) ? 'true' : 'false'"
				class="cn-quick-filter-bar__tab"
				:class="[{ 'cn-quick-filter-bar__tab--active': isChipActive(entry.index) }]"
				@click="onClick(entry.index)">
				<CnIcon
					v-if="entry.tab.icon"
					:name="entry.tab.icon"
					:size="16"
					class="cn-quick-filter-bar__icon" />
				<span class="cn-quick-filter-bar__label">{{ entry.tab.label }}</span>
			</button>
		</div>
		<!-- The overflow is a CHIP and not a toolbar button: it is one of the
		     lenses, so it carries the same pill, the same active fill and the
		     label of whichever hidden lens is on. -->
		<NcPopover
			v-if="overflowEntries.length > 0"
			v-model:shown="moreOpen"
			:triggers="[]"
			popupRole="dialog"
			placement="bottom-end"
			popoverBaseClass="cn-quick-filter-bar__popper">
			<template #trigger>
				<button
					type="button"
					data-testid="cn-quick-filter-more"
					class="cn-quick-filter-bar__tab cn-quick-filter-bar__more"
					:class="{
						'cn-quick-filter-bar__tab--active': activeOverflowEntries.length > 0,
						'cn-quick-filter-bar__more--icon-only': !overflowLabel,
					}"
					:aria-expanded="moreOpen ? 'true' : 'false'"
					aria-haspopup="dialog"
					:aria-label="overflowAriaLabel"
					:title="overflowAriaLabel"
					@click="moreOpen = !moreOpen">
					<span v-if="overflowLabel" class="cn-quick-filter-bar__label">{{ overflowLabel }}</span>
					<DotsHorizontal :size="16" class="cn-quick-filter-bar__icon" />
				</button>
			</template>
			<div
				class="cn-quick-filter-bar__more-panel"
				@keydown.escape.stop="moreOpen = false">
				<p class="cn-quick-filter-bar__more-heading">
					{{ moreHeading }}
				</p>
				<div class="cn-quick-filter-bar__more-list">
					<button
						v-for="entry in overflowEntries"
						:key="entry.tab.label + ':' + entry.index"
						type="button"
						data-testid="cn-quick-filter-more-item"
						class="cn-quick-filter-bar__tab cn-quick-filter-bar__more-item"
						:class="{ 'cn-quick-filter-bar__tab--active': isChipActive(entry.index) }"
						:aria-pressed="isChipActive(entry.index) ? 'true' : 'false'"
						@click="onOverflowClick(entry.index)">
						<CnIcon
							v-if="entry.tab.icon"
							:name="entry.tab.icon"
							:size="16"
							class="cn-quick-filter-bar__icon" />
						<span class="cn-quick-filter-bar__label">{{ entry.tab.label }}</span>
					</button>
				</div>
			</div>
		</NcPopover>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcPopover, NcSelect } from '@nextcloud/vue'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import CnIcon from '../CnIcon/CnIcon.vue'

/**
 * CnQuickFilterBar — quick-filter control rendered above a `type:"index"`
 * page's table. Each tab carries a manifest `filter` map that `CnIndexPage`
 * merges into the `useListView` fetch when the tab is active.
 *
 * Two presentations, chosen by `mode`:
 * - `'chips'` (default) — a horizontal row of pill-shaped buttons; the
 *   active one is filled, the rest outlined. `maxVisible` caps how many
 *   pills render and moves the rest into an overflow menu.
 * - `'dropdown'` — a single `NcSelect`. The "All" / empty-filter tab is
 *   dropped from the options (an empty selection means "all").
 *
 * Two selection cardinalities, chosen by `multiple`:
 * - single (default) — one active tab; uses the `activeIndex` v-model
 *   (`update:active-index`).
 * - `multiple` — several tabs at once; uses the `selectedIndices` array
 *   prop + `update:selected-indices` event. `CnIndexPage` ORs the selected
 *   tabs' filters together.
 *
 * Implementation is deliberately a thin styled `<button>` list (chips) /
 * `NcSelect` (dropdown) rather than `NcAppNavigation*` — this lives INSIDE
 * the index page, not as the app's main nav.
 */
export default {
	name: 'CnQuickFilterBar',

	components: { CnIcon, DotsHorizontal, NcPopover, NcSelect },

	// NO `model: { prop, event }` OPTION.
	//
	// The Vue-2 `model` option is REMOVED in Vue 3 — read by nothing, warned
	// about by nothing — so it survived the migration as a declaration that
	// looked authoritative while doing exactly zero. The component's real
	// contract is the explicit `:active-index` / `@update:active-index` pair
	// (and `:selected-indices` / `@update:selected-indices` in `multiple`
	// mode), which is what `CnIndexPage` binds. Surfaced by
	// `vue/no-deprecated-model-definition`, which this repo now arms through
	// its own published preset.

	props: {
		/**
		 * Tab definitions — same shape `pages[].config.quickFilters[]` uses.
		 * `filter` is consumed by the parent (CnIndexPage), not this component.
		 */
		tabs: {
			type: Array,
			required: true,
			validator: (arr) => Array.isArray(arr) && arr.every((t) => t && typeof t.label === 'string'),
		},

		/**
		 * Render bare (no padding / bottom border / background) for embedding
		 * inline inside another bar — e.g. the `#filters` slot of `CnActionsBar`,
		 * so the tabs sit beside the view toggle instead of as a separate row.
		 */
		inline: {
			type: Boolean,
			default: false,
		},

		/** Index of the currently active tab, or `null` for none active. Single-select only. */
		activeIndex: {
			type: Number,
			default: null,
		},

		/**
		 * Presentation: `'chips'` (pill button strip, default) or
		 * `'dropdown'` (a single `NcSelect`).
		 *
		 * @type {'chips'|'dropdown'}
		 */
		mode: {
			type: String,
			default: 'chips',
			validator: (v) => ['chips', 'dropdown'].includes(v),
		},

		/**
		 * Allow more than one tab active at once. Selection is exposed via
		 * `selectedIndices` + `update:selected-indices`; the parent ORs the
		 * selected tabs' filters together.
		 */
		multiple: {
			type: Boolean,
			default: false,
		},

		/**
		 * Active tab indices when `multiple` is set (the array v-model).
		 *
		 * @type {number[]}
		 */
		selectedIndices: {
			type: Array,
			default: () => [],
		},

		/** Accessible label / placeholder for the dropdown control. */
		selectLabel: {
			type: String,
			default: 'Filter',
		},

		/** Placeholder text for the dropdown (falls back to `selectLabel`). */
		placeholder: {
			type: String,
			default: '',
		},

		/**
		 * Chips mode only: how many pills render inline before the rest move
		 * into an overflow menu. `0` (the default) renders every tab, which is
		 * the behaviour this component has always had. The visible set is the
		 * FIRST `maxVisible` tabs in declared order — reorder `tabs` to change
		 * which ones stay out. Ignored in `dropdown` mode.
		 */
		maxVisible: {
			type: Number,
			default: 0,
			validator: (v) => Number.isFinite(v) && v >= 0,
		},
	},

	emits: ['update:active-index', 'update:selected-indices'],

	data() {
		return {
			/** Whether the overflow chip's panel is open. */
			moreOpen: false,
		}
	},

	computed: {
		/**
		 * Every tab paired with its own index, so the overflow split can slice
		 * the list without losing the index the parent's filters are keyed on.
		 *
		 * @return {Array<{tab: object, index: number}>}
		 */
		entries() {
			return this.tabs.map((tab, index) => ({ tab, index }))
		},

		/**
		 * The tabs rendered as pills — all of them unless `maxVisible` caps it.
		 *
		 * @return {Array<{tab: object, index: number}>}
		 */
		visibleEntries() {
			if (!this.maxVisible || this.tabs.length <= this.maxVisible) {
				return this.entries
			}
			return this.entries.slice(0, this.maxVisible)
		},

		/**
		 * The tabs moved into the overflow menu (empty when `maxVisible` is 0
		 * or there is nothing to hide).
		 *
		 * @return {Array<{tab: object, index: number}>}
		 */
		overflowEntries() {
			if (!this.maxVisible || this.tabs.length <= this.maxVisible) {
				return []
			}
			return this.entries.slice(this.maxVisible)
		},

		/**
		 * The active tabs that live in the overflow menu.
		 *
		 * @return {Array<{tab: object, index: number}>}
		 */
		activeOverflowEntries() {
			return this.overflowEntries.filter((e) => this.isChipActive(e.index))
		},

		/**
		 * Text on the overflow chip — an active hidden tab names itself there,
		 * so the strip never reads "All" while the list is narrowed. Nothing
		 * active leaves the chip as the bare `⋯` glyph.
		 *
		 * @return {string}
		 */
		overflowLabel() {
			const active = this.activeOverflowEntries
			if (active.length === 1) {
				return active[0].tab.label
			}
			if (active.length > 1) {
				return t('nextcloud-vue', '{count} filters', { count: active.length })
			}
			return ''
		},

		/** @return {string} Accessible name for the overflow chip. */
		overflowAriaLabel() {
			if (this.overflowLabel) {
				return t('nextcloud-vue', '{label} — show the other filters', { label: this.overflowLabel })
			}
			return t('nextcloud-vue', '{count} more filters', { count: this.overflowEntries.length })
		},

		/** @return {string} Heading above the hidden chips in the panel. */
		moreHeading() {
			return t('nextcloud-vue', 'More filters')
		},

		/**
		 * Dropdown options: every tab that carries a non-empty `filter`,
		 * tagged with its original index. The "All" / empty-filter tab is
		 * omitted — an empty selection already means "all".
		 *
		 * @return {Array<{label: string, index: number, icon: string}>}
		 */
		dropdownOptions() {
			return this.tabs
				.map((tab, index) => ({ label: tab.label, icon: tab.icon, index, _empty: this.isEmptyFilter(tab) }))
				.filter((o) => !o._empty)
		},

		/**
		 * Current NcSelect value — an array of option objects when
		 * `multiple`, a single option object (or null) otherwise.
		 *
		 * @return {object|object[]|null}
		 */
		dropdownValue() {
			if (this.multiple) {
				return this.dropdownOptions.filter((o) => this.selectedIndices.includes(o.index))
			}
			return this.dropdownOptions.find((o) => o.index === this.activeIndex) || null
		},
	},

	methods: {
		/**
		 * Is tab `i` rendered active in chips mode (handles both single
		 * `activeIndex` and `multiple` `selectedIndices`).
		 *
		 * @param {number} i Zero-based tab index.
		 * @return {boolean}
		 */
		isChipActive(i) {
			return this.multiple ? this.selectedIndices.includes(i) : i === this.activeIndex
		},

		/**
		 * Whether a tab's `filter` map is absent/empty (the "All" tab).
		 *
		 * @param {{label: string, filter?: object}} tab An entry from the `tabs` prop.
		 * @return {boolean} True when the tab applies no filter, so selecting it
		 *   clears the multi-selection rather than adding to it.
		 */
		isEmptyFilter(tab) {
			return !tab || !tab.filter || Object.keys(tab.filter).length === 0
		},

		/**
		 * Chip-click handler. In single mode emits the new active index; in
		 * multiple mode toggles the index in/out of the selection. Clicking
		 * an empty-filter ("All") chip clears the multi-selection.
		 *
		 * @param {number} i Zero-based tab index.
		 */
		onClick(i) {
			if (this.multiple) {
				if (this.isEmptyFilter(this.tabs[i])) {
					/**
					 * @event update:selected-indices Active tab indices changed (multiple mode).
					 * @type {number[]}
					 */
					this.$emit('update:selected-indices', [])
					return
				}
				const next = this.selectedIndices.includes(i)
					? this.selectedIndices.filter((x) => x !== i)
					: [...this.selectedIndices, i]
				this.$emit('update:selected-indices', next)
				return
			}
			if (i === this.activeIndex) {
				return
			}
			this.$emit('update:active-index', i)
		},

		/**
		 * A chip clicked inside the overflow panel. Single-select closes the
		 * panel on the way out; multi-select keeps it open so several lenses
		 * can be toggled in one visit.
		 *
		 * @param {number} i Zero-based tab index.
		 */
		onOverflowClick(i) {
			this.onClick(i)
			if (!this.multiple) {
				this.moreOpen = false
			}
		},

		/**
		 * NcSelect input handler — normalises the option object(s) back to
		 * indices and emits the matching model event.
		 *
		 * @param {object|object[]|null} val Selected option object(s).
		 */
		onSelectInput(val) {
			if (this.multiple) {
				const arr = Array.isArray(val) ? val : []
				this.$emit('update:selected-indices', arr.map((o) => o.index))
				return
			}
			this.$emit('update:active-index', val ? val.index : null)
		},
	},
}
</script>

<style scoped>
.cn-quick-filter-bar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-bottom: 1px solid var(--color-border);
	background: var(--color-main-background);
}

.cn-quick-filter-bar__tabs {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

/* Inline variant — bare strip for embedding inside another bar (e.g. the
   CnActionsBar #filters slot), so it reads as a control beside the view toggle
   rather than a separate bordered row. */
.cn-quick-filter-bar--inline {
	padding: 0;
	border-bottom: none;
	background: transparent;
}

/* Dropdown variant — give the NcSelect a sensible minimum so multi-select
   chips have room without stretching the whole bar. */
.cn-quick-filter-bar--dropdown {
	align-items: center;
}

.cn-quick-filter-bar__select {
	min-width: 220px;
}

.cn-quick-filter-bar__tab {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-pill, 999px);
	background: transparent;
	color: var(--color-main-text);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	transition: background-color 120ms, color 120ms, border-color 120ms;
}

.cn-quick-filter-bar__tab:hover,
.cn-quick-filter-bar__tab:focus-visible {
	background: var(--color-background-hover);
	outline: none;
}

.cn-quick-filter-bar__tab--active {
	background: var(--color-primary-element, var(--color-primary, #4376fc));
	color: var(--color-primary-element-text, #fff);
	border-color: var(--color-primary-element, var(--color-primary, #4376fc));
}

.cn-quick-filter-bar__icon {
	display: inline-flex;
}

.cn-quick-filter-bar__label {
	line-height: 1;
}

/* NcPopover wraps its trigger in a plain `<div class="v-popper">`, which as a
   block would drop the chip onto its own line under the strip. */
.cn-quick-filter-bar > :deep(.v-popper) {
	display: inline-flex;
}

/* The `⋯` glyph is the chip's whole content while no hidden lens is on, so the
   pill tightens to a circle rather than sitting as a wide empty capsule. */
.cn-quick-filter-bar__more {
	gap: 4px;
}

.cn-quick-filter-bar__more--icon-only {
	padding: 4px 8px;
}

.cn-quick-filter-bar__more[aria-expanded='true'] {
	border-color: var(--color-primary-element, var(--color-primary, #4376fc));
}

.cn-quick-filter-bar__more-panel {
	padding: 10px 12px 12px;
	max-width: 280px;
}

.cn-quick-filter-bar__more-heading {
	margin: 0 0 8px;
	font-size: 12px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
}

/* The hidden lenses stay chips — the panel is more of the strip, not a
   different control that happens to hold the same filters. */
.cn-quick-filter-bar__more-list {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	max-height: 320px;
	overflow-y: auto;
}

.cn-quick-filter-bar__more-item {
	max-width: 100%;
}

.cn-quick-filter-bar__more-item .cn-quick-filter-bar__label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>

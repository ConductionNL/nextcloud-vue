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
			:value="dropdownValue"
			:options="dropdownOptions"
			:multiple="multiple"
			:close-on-select="!multiple"
			:clearable="true"
			label="label"
			class="cn-quick-filter-bar__select"
			:input-label="selectLabel"
			:aria-label-combobox="selectLabel"
			:placeholder="placeholder || selectLabel"
			@input="onSelectInput" />
	</div>
	<!-- Chips mode (default): the clickable tab strip. -->
	<div v-else class="cn-quick-filter-bar" :class="{ 'cn-quick-filter-bar--inline': inline }" role="tablist">
		<button
			v-for="(tab, i) in tabs"
			:key="tab.label + ':' + i"
			type="button"
			role="tab"
			:aria-selected="isChipActive(i) ? 'true' : 'false'"
			:class="['cn-quick-filter-bar__tab', { 'cn-quick-filter-bar__tab--active': isChipActive(i) }]"
			@click="onClick(i)">
			<CnIcon
				v-if="tab.icon"
				:name="tab.icon"
				:size="16"
				class="cn-quick-filter-bar__icon" />
			<span class="cn-quick-filter-bar__label">{{ tab.label }}</span>
		</button>
	</div>
</template>

<script>
import CnIcon from '../CnIcon/CnIcon.vue'
import { NcSelect } from '@nextcloud/vue'

/**
 * CnQuickFilterBar — quick-filter control rendered above a `type:"index"`
 * page's table. Each tab carries a manifest `filter` map that `CnIndexPage`
 * merges into the `useListView` fetch when the tab is active.
 *
 * Two presentations, chosen by `mode`:
 * - `'chips'` (default) — a horizontal row of pill-shaped buttons; the
 *   active one is filled, the rest outlined.
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

	components: { CnIcon, NcSelect },

	model: {
		prop: 'activeIndex',
		event: 'update:active-index',
	},

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
	},

	computed: {
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
		/** Whether a tab's `filter` map is absent/empty (the "All" tab). */
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
			if (i === this.activeIndex) return
			this.$emit('update:active-index', i)
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
	gap: 8px;
	padding: 8px 12px;
	border-bottom: 1px solid var(--color-border);
	background: var(--color-main-background);
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
</style>

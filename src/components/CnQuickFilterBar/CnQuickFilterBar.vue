<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: AGPL-3.0-or-later
  -->

<template>
	<div class="cn-quick-filter-bar" role="tablist">
		<button
			v-for="(tab, i) in tabs"
			:key="tab.label + ':' + i"
			type="button"
			role="tab"
			:aria-selected="i === activeIndex ? 'true' : 'false'"
			class="cn-quick-filter-bar__tab"
			:class="[{ 'cn-quick-filter-bar__tab--active': i === activeIndex }]"
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

/**
 * CnQuickFilterBar — clickable tab strip rendered above a `type:"index"`
 * page's table. Each tab carries a manifest `filter` map that `CnIndexPage`
 * merges into the `useListView` fetch when the tab is active.
 *
 * Visual: a horizontal row of pill-shaped buttons; the active one is
 * filled, the rest outlined. Implementation is deliberately a thin
 * styled `<button>` list rather than `NcAppNavigation*` — this lives
 * INSIDE the index page, not as the app's main nav.
 *
 * Emits `update:active-index` so the parent can use `v-model:active-index`
 * (Vue 2.6+) or `:active-index="i" @update:active-index="i = $event"`.
 */
export default {
	name: 'CnQuickFilterBar',

	components: { CnIcon },

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

		/** Index of the currently active tab, or `null` for none active. */
		activeIndex: {
			type: Number,
			default: null,
		},
	},

	methods: {
		/**
		 * Tab-click handler. Emits the new index — parent updates its
		 * own state and triggers the re-fetch.
		 *
		 * @param {number} i Zero-based tab index.
		 */
		onClick(i) {
			if (i === this.activeIndex) return
			/**
			 * Fired when the user clicks a different tab. Drives
			 * `v-model:active-index` on the parent; payload is the
			 * zero-based index of the newly active tab.
			 *
			 * @event update:active-index
			 * @type {number}
			 */
			this.$emit('update:active-index', i)
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

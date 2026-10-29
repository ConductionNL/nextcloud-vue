<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-index-page__filter-strip"
		role="group"
		:aria-label="label"
		data-testid="cn-index-filter-strip">
		<button
			v-for="entry in entries"
			:key="entry.key"
			type="button"
			class="cn-index-page__filter-strip-pill"
			:class="{ 'cn-index-page__filter-strip-pill--active': entry.active }"
			:aria-pressed="entry.active ? 'true' : 'false'"
			:data-testid="`cn-index-filter-strip-${entry.key}`"
			@click="$emit('pick', entry.values || entry.value)">
			<span>{{ entry.label }}</span> <span v-if="entry.count !== null" class="cn-index-page__filter-strip-count">{{ entry.count }}</span>
		</button>
	</div>
</template>

<script>
/**
 * The index page's second filter strip (`filterStrip`): "All" and one pill
 * per value, each with its count. CnIndexPage draws it under the toolbar, or
 * in the list card with `quickFilterPlacement: "card"`.
 *
 * @spec openspec/changes/index-lenses-in-list-card/specs/index-lenses-in-list-card/spec.md#requirement-the-quick-filters-can-sit-in-the-list-card
 */
export default {
	name: 'CnIndexFilterStrip',

	props: {
		/**
		 * The pills: `{ key, value, values?, label, active, count }`.
		 *
		 * @type {Array<object>}
		 */
		entries: {
			type: Array,
			required: true,
		},

		/** The strip's accessible name. */
		label: {
			type: String,
			default: '',
		},
	},

	emits: [
		/**
		 * A pill was picked.
		 *
		 * @event pick
		 * @type {string|string[]} The pill's value or values, '' for All.
		 */
		'pick',
	],
}
</script>

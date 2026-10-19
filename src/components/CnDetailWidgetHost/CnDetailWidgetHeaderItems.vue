<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<span class="cn-detail-widget-header-items">
		<CnStatusBadge
			v-if="header.pill"
			:label="header.pill.label"
			:variant="header.pill.variant"
			data-testid="cn-detail-widget-header-pill" />
		<span
			v-if="header.note"
			class="cn-detail-page__catalog-note"
			data-testid="cn-detail-widget-header-note">{{ header.note }}</span>
		<button
			v-for="(action, index) in header.actions"
			:key="`${index}-${action.label}`"
			type="button"
			class="cn-detail-page__catalog-action"
			data-testid="cn-detail-widget-header-action"
			@click="action.run()">
			<CnIcon v-if="action.icon" :name="action.icon" :size="16" />
			{{ action.label }}
		</button>
	</span>
</template>

<script>
import CnIcon from '../CnIcon/CnIcon.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'

/**
 * The extras a widget reports for its card's title row through its `header`
 * event: a status pill, a note and its actions. Drawn by CnDetailWidgetHost in
 * the `#actions` slot of the card it wraps a widget in.
 */
export default {
	name: 'CnDetailWidgetHeaderItems',

	components: { CnIcon, CnStatusBadge },

	props: {
		/** The reported header: `{ pill, note, actions: [{ label, icon?, run }] }`. */
		header: {
			type: Object,
			required: true,
		},
	},
}
</script>

<style scoped>
.cn-detail-widget-header-items {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px;
}
</style>

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
		<template v-for="(action, index) in header.actions" :key="`${index}-${action.label}`">
			<!-- `variant: 'primary'`: the card's main action as a filled button
			     (a task table's "New task"); otherwise the quiet header link. -->
			<NcButton
				v-if="action.variant === 'primary'"
				variant="primary"
				class="cn-detail-widget-header-items__primary"
				data-testid="cn-detail-widget-header-action"
				@click="action.run()">
				<template v-if="action.icon" #icon>
					<CnIcon :name="action.icon" :size="20" />
				</template>
				{{ action.label }}
			</NcButton>
			<button
				v-else
				type="button"
				class="cn-detail-page__catalog-action"
				data-testid="cn-detail-widget-header-action"
				@click="action.run()">
				<CnIcon v-if="action.icon" :name="action.icon" :size="16" />
				{{ action.label }}
			</button>
		</template>
	</span>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'

/**
 * The extras a widget reports for its card's title row through its `header`
 * event: a status pill, a note and its actions. Drawn by CnDetailWidgetHost in
 * the `#actions` slot of the card it wraps a widget in.
 */
export default {
	name: 'CnDetailWidgetHeaderItems',

	components: { CnIcon, CnStatusBadge, NcButton },

	props: {
		/** The reported header: `{ pill, note, actions: [{ label, icon?, variant?, run }] }`. */
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

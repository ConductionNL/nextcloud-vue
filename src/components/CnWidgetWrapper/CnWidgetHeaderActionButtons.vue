<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<span class="cn-widget-header-actions">
		<NcButton
			v-for="action in actions"
			:key="action.key"
			:variant="action.variant === 'primary' ? 'primary' : 'secondary'"
			class="cn-widget-header-actions__button"
			data-testid="cn-widget-header-action"
			@click="action.run()">
			<template v-if="action.icon" #icon>
				<CnIcon :name="action.icon" :size="16" />
			</template>
			{{ action.label }}
		</NcButton>
	</span>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'

/**
 * The buttons a widget's manifest `headerActions` put in its card's title
 * row, as resolved by `resolveWidgetHeaderActions`. Drawn by CnWidgetWrapper,
 * CnDetailCard and a bare tab panel's heading.
 */
export default {
	name: 'CnWidgetHeaderActionButtons',

	components: { CnIcon, NcButton },

	props: {
		/** The resolved buttons: `[{ key, label, icon, variant, run }]`. */
		actions: {
			type: Array,
			required: true,
		},
	},
}
</script>

<style scoped>
.cn-widget-header-actions {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}
</style>

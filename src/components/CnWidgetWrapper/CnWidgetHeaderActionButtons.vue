<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<span class="cn-widget-header-actions">
		<template v-for="action in actions" :key="action.key">
			<!-- `variant: "link"`: the card's text link (DqTermijnen
			     "Kwartaalrapport downloaden"), still a button that runs. -->
			<button
				v-if="action.variant === 'link'"
				type="button"
				class="cn-widget-header-actions__link"
				data-testid="cn-widget-header-action"
				@click="action.run()">
				{{ action.label }}
			</button>
			<NcButton
				v-else
				:variant="action.variant === 'primary' ? 'primary' : 'secondary'"
				class="cn-widget-header-actions__button"
				data-testid="cn-widget-header-action"
				@click="action.run()">
				<template v-if="action.icon" #icon>
					<CnIcon :name="action.icon" :size="16" />
				</template>
				{{ action.label }}
			</NcButton>
		</template>
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
		/** The resolved buttons: `[{ key, label, icon, variant, run }]`; `variant: "link"` draws a text link. */
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

.cn-widget-header-actions__link {
	margin: 0;
	padding: 0;
	border: 0;
	background: none;
	min-height: 0;
	color: var(--color-primary-element);
	font: inherit;
	font-size: var(--cn-widget-header-link-size, 14px);
	font-weight: var(--cn-widget-header-link-weight, 600);
	text-decoration: underline;
	white-space: nowrap;
	cursor: pointer;
}

.cn-widget-header-actions__link:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}
</style>

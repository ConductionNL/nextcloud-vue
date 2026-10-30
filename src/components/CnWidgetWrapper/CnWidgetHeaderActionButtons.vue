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
			<!-- `variant: "tonal"`: the card's pill button (PqLoyaliteit
			     "Exporteren als CSV"). -->
			<button
				v-else-if="action.variant === 'tonal'"
				type="button"
				class="cn-widget-header-actions__tonal"
				data-testid="cn-widget-header-action"
				@click="action.run()">
				<CnIcon v-if="action.icon" :name="action.icon" :size="16" />
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

.cn-widget-header-actions__tonal {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin: 0;
	min-height: 34px;
	padding: 0 12px;
	border: 0;
	border-radius: 17px;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	font: inherit;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	cursor: pointer;
}

/* server.css gives every button `margin: 3px 3px 3px 0` at (0,2,1), which
   put 11px between two buttons; the doubled class outranks it. */
.cn-widget-header-actions__link.cn-widget-header-actions__link,
.cn-widget-header-actions__tonal.cn-widget-header-actions__tonal {
	margin: 0;
}

.cn-widget-header-actions__tonal:hover {
	background: var(--color-primary-element-light-hover);
}

.cn-widget-header-actions__link:focus-visible,
.cn-widget-header-actions__tonal:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}
</style>

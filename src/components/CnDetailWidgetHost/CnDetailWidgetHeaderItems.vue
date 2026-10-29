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
			<!-- `variant: 'secondary'`: the card's outlined button (PqKlant
			     Relaties "Toevoegen", as DqTaak "Notitie toevoegen"); with
			     `items` it opens a menu of them (Contactkanalen). -->
			<NcActions
				v-if="action.variant === 'secondary' && Array.isArray(action.items)"
				variant="secondary"
				:menuName="action.label"
				:forceMenu="true"
				:forceName="true"
				:ariaLabel="action.ariaLabel || action.label"
				class="cn-detail-widget-header-items__card-button"
				data-testid="cn-detail-widget-header-action">
				<template v-if="action.icon" #icon>
					<CnIcon :name="action.icon" :size="16" />
				</template>
				<NcActionButton
					v-for="(item, itemIndex) in action.items"
					:key="`${itemIndex}-${item.label}`"
					:closeAfterClick="true"
					@click="item.run()">
					{{ item.label }}
				</NcActionButton>
			</NcActions>
			<NcButton
				v-else-if="action.variant === 'secondary'"
				variant="secondary"
				:ariaLabel="action.ariaLabel || undefined"
				class="cn-detail-widget-header-items__card-button"
				data-testid="cn-detail-widget-header-action"
				@click="action.run()">
				<template v-if="action.icon" #icon>
					<CnIcon :name="action.icon" :size="16" />
				</template>
				{{ action.label }}
			</NcButton>
			<NcButton
				v-else-if="action.variant === 'primary'"
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
				:class="{ 'cn-detail-page__catalog-action--add': action.add === true }"
				data-testid="cn-detail-widget-header-action"
				@click="action.run()">
				<CnIcon v-if="action.icon" :name="action.icon" :size="16" />
				{{ action.label }}
			</button>
		</template>
	</span>
</template>

<script>
import { NcActionButton, NcActions, NcButton } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'

/**
 * The extras a widget reports for its card's title row through its `header`
 * event: a status pill, a note and its actions. Drawn by CnDetailWidgetHost in
 * the `#actions` slot of the card it wraps a widget in.
 */
export default {
	name: 'CnDetailWidgetHeaderItems',

	components: { CnIcon, CnStatusBadge, NcActionButton, NcActions, NcButton },

	props: {
		/**
		 * The reported header: `{ pill, note, actions: [{ label, icon?, variant?, add?, ariaLabel?, items?, run }] }`;
		 * `add: true` marks a list's Add; `variant: "secondary"` is the card's outlined button, a menu of
		 * `items` (`[{ label, run }]`) when it has them.
		 */
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

.cn-detail-page__catalog-action {
	align-items: center;
	background: var(--color-primary-element-light);
	border: 0;
	border-radius: 16px;
	color: var(--color-primary-element-light-text, var(--color-primary-element));
	cursor: pointer;
	display: inline-flex;
	font: inherit;
	font-size: 13px;
	font-weight: 700;
	gap: 6px;
	min-height: 32px;
	padding: 0 14px;
	white-space: nowrap;
}

/* server.css gives every button `margin: 3px 3px 3px 0` at (0,2,1); the
   doubled class outranks it. */
.cn-detail-page__catalog-action.cn-detail-page__catalog-action {
	margin: 0;
}
</style>

<template>
	<div class="cn-view-mode-toggle" role="group" :aria-label="ariaLabel">
		<NcButton
			:type="value === 'cards' ? 'primary' : 'secondary'"
			:aria-pressed="String(value === 'cards')"
			@click="$emit('input', 'cards')">
			<template #icon>
				<ViewGrid :size="20" />
			</template>
			{{ cardsLabel }}
		</NcButton>
		<NcButton
			:type="value === 'table' ? 'primary' : 'secondary'"
			:aria-pressed="String(value === 'table')"
			@click="$emit('input', 'table')">
			<template #icon>
				<ViewList :size="20" />
			</template>
			{{ tableLabel }}
		</NcButton>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import ViewGrid from 'vue-material-design-icons/ViewGrid.vue'
import ViewList from 'vue-material-design-icons/ViewList.vue'

/**
 * CnViewModeToggle — Cards/Table view mode toggle.
 *
 * @example
 * <CnViewModeToggle v-model="viewMode" />
 */
export default {
	name: 'CnViewModeToggle',

	components: {
		NcButton,
		ViewGrid,
		ViewList,
	},

	props: {
		/** Current view mode: 'cards' or 'table' */
		value: {
			type: String,
			default: 'table',
			validator: (v) => ['cards', 'table'].includes(v),
		},
		/** Label for cards button */
		cardsLabel: {
			type: String,
			default: 'Cards',
		},
		/** Label for table button */
		tableLabel: {
			type: String,
			default: 'Table',
		},
		/** Aria label for the toggle group */
		ariaLabel: {
			type: String,
			default: 'View mode',
		},
	},
}
</script>

<style scoped>
.cn-view-mode-toggle {
	display: inline-flex;
	gap: 0;
	border-radius: var(--border-radius-pill, 20px);
	overflow: hidden;
}
</style>

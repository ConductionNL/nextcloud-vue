<template>
	<NcActions :force-menu="actions.length > 3" :primary="primary" :menu-name="menuName">
		<NcActionButton
			v-for="action in actions"
			:key="action.label"
			:disabled="action.disabled"
			:class="{ 'cn-row-action--destructive': action.destructive }"
			@click="onAction(action)">
			<template v-if="action.icon" #icon>
				<component :is="action.icon" :size="20" />
			</template>
			{{ action.label }}
		</NcActionButton>
	</NcActions>
</template>

<script>
import { NcActions, NcActionButton } from '@nextcloud/vue'

/**
 * CnRowActions — Action menu wrapper for table rows and cards.
 *
 * Wraps NcActions + NcActionButton for consistent row/card action menus.
 * Actions are defined as an array of objects with label, icon, handler, etc.
 *
 * @example
 * <CnRowActions
 *   :actions="[
 *     { label: 'Edit', icon: PencilIcon, handler: (row) => editRow(row) },
 *     { label: 'Delete', icon: TrashIcon, handler: (row) => deleteRow(row), destructive: true },
 *   ]"
 *   :row="row" />
 */
export default {
	name: 'CnRowActions',

	components: {
		NcActions,
		NcActionButton,
	},

	props: {
		/**
		 * Action definitions.
		 * @type {Array<{label: string, icon?: Component, handler: Function, disabled?: boolean, destructive?: boolean}>}
		 */
		actions: {
			type: Array,
			default: () => [],
		},
		/** The row/object data (passed to action handlers) */
		row: {
			type: Object,
			default: null,
		},
		/** Whether to use primary styling for the action menu trigger */
		primary: {
			type: Boolean,
			default: false,
		},
		/** Label shown on the action menu trigger button */
		menuName: {
			type: String,
			default: undefined,
		},
	},

	methods: {
		onAction(action) {
			if (action.handler && typeof action.handler === 'function') {
				action.handler(this.row)
			}
			this.$emit('action', { action: action.label, row: this.row })
		},
	},
}
</script>

<style scoped>
.cn-row-action--destructive {
	color: var(--color-error) !important;
}
</style>

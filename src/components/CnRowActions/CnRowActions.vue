<template>
	<NcActions :force-menu="visibleActions.length > 3" :primary="primary" :menu-name="menuName">
		<NcActionButton
			v-for="action in visibleActions"
			:key="action.label"
			:title="getTitle(action)"
			:disabled="isDisabled(action)"
			:class="{ 'cn-row-action--destructive': action.destructive }"
			close-after-click
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
		 *
		 * Each action supports:
		 * - `label` (string, required) — display text
		 * - `icon` (component) — MDI icon
		 * - `handler` (function) — called with `row` on click
		 * - `disabled` (boolean | (row) => boolean) — gray out the entry
		 * - `visible` (boolean | (row) => boolean) — when `false`, hide the entry from the menu (default: shown)
		 * - `title` (string | (row) => string) — native tooltip shown on hover (useful to explain why an entry is disabled)
		 * - `destructive` (boolean) — apply error color styling
		 *
		 * @type {Array<{label: string, icon?: object, handler: Function, disabled?: boolean | Function, visible?: boolean | Function, title?: string | Function, destructive?: boolean}>}
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

	computed: {
		/**
		 * Filter actions by their `visible` predicate. An action without a
		 * `visible` field is always shown (backwards compatible).
		 * @return {Array} Visible actions for the current row.
		 */
		visibleActions() {
			return this.actions.filter((action) => {
				if (action.visible === undefined) return true
				if (typeof action.visible === 'function') {
					return !!action.visible(this.row)
				}
				return !!action.visible
			})
		},
	},

	methods: {
		/**
		 * Resolve disabled state for an action — supports both boolean and function.
		 * @param {object} action - The action definition
		 * @return {boolean} Whether the action is disabled
		 */
		isDisabled(action) {
			if (typeof action.disabled === 'function') {
				return action.disabled(this.row)
			}
			return !!action.disabled
		},
		/**
		 * Resolve the title (native tooltip) for an action — supports both
		 * string and function forms. Returns undefined when no title is
		 * provided so the attribute is not rendered.
		 * @param {object} action - The action definition
		 * @return {string|undefined} The resolved tooltip text, or undefined.
		 */
		getTitle(action) {
			if (typeof action.title === 'function') {
				return action.title(this.row) || undefined
			}
			return action.title || undefined
		},
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

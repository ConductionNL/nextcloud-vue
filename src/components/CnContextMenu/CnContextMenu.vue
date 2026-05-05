<template>
	<NcActions
		:open.sync="internalOpen"
		:manual-open="true"
		:force-menu="true"
		class="cn-context-menu"
		container="body"
		@close="onClose">
		<!-- Dynamic actions from array prop -->
		<NcActionButton
			v-for="action in visibleActions"
			:key="action.label"
			:title="resolveTitle(action)"
			:disabled="resolveDisabled(action)"
			:class="{ 'cn-row-action--destructive': action.destructive }"
			close-after-click
			@click="onAction(action)">
			<template v-if="action.icon" #icon>
				<component :is="action.icon" :size="20" />
			</template>
			{{ action.label }}
		</NcActionButton>

		<!-- Custom content slot (for hardcoded buttons) -->
		<slot />
	</NcActions>
</template>

<script>
import { NcActions, NcActionButton } from '@nextcloud/vue'

/**
 * CnContextMenu — Right-click context menu wrapper around NcActions.
 *
 * Provides a pre-configured NcActions instance that positions itself at the
 * cursor via the `useContextMenu` composable's CSS custom properties. Accepts
 * an `actions` array for the common dynamic case (like CnRowActions), and a
 * default slot for hardcoded NcActionButton content.
 *
 * Pair with `useContextMenu()` for state management (open/close, target item,
 * cursor positioning). The composable handles the DOM attributes; this component
 * handles the NcActions template boilerplate.
 *
 * Dynamic actions (CnIndexPage pattern)
 * <CnContextMenu
 *   :open.sync="contextMenuOpen"
 *   :actions="mergedActions"
 *   :target-item="contextMenuRow"
 *   @action="$emit('action', $event)"
 *   @close="closeContextMenu" />
 *
 * Custom buttons via slot (Doriath pattern)
 * <CnContextMenu
 *   :open.sync="contextMenuOpen"
 *   @close="closeContextMenu">
 *   <NcActionButton close-after-click @click="onRename">
 *     <template #icon><PencilIcon :size="20" /></template>
 *     Rename
 *   </NcActionButton>
 * </CnContextMenu>
 */
export default {
	name: 'CnContextMenu',

	components: {
		NcActions,
		NcActionButton,
	},

	props: {
		/**
		 * Whether the context menu is open. Use with `.sync` modifier.
		 * Bind to `useContextMenu().isOpen`.
		 */
		open: {
			type: Boolean,
			default: false,
		},
		/**
		 * Action definitions rendered as NcActionButton items.
		 * Same format as CnRowActions: `{ label, icon?, handler?, disabled?, visible?, title?, destructive? }`.
		 * `visible` (boolean | (targetItem) => boolean) hides the entry when falsy
		 * (default: shown). `title` (string | (targetItem) => string) renders as
		 * a native tooltip — useful for explaining why an entry is disabled.
		 * When the entire array is empty (or all entries are filtered out), only
		 * the default slot content is rendered.
		 * @type {Array<{label: string, icon?: object, handler?: Function, disabled?: boolean | Function, visible?: boolean | Function, title?: string | Function, destructive?: boolean}>}
		 */
		actions: {
			type: Array,
			default: () => [],
		},
		/**
		 * The right-clicked item (row, folder, etc.). Passed to action `handler`
		 * and `disabled` callbacks, and included in the `action` event payload.
		 * Bind to `useContextMenu().targetItem`.
		 */
		targetItem: {
			type: [Object, String, Number],
			default: null,
		},
	},

	data() {
		return {
			internalOpen: this.open,
		}
	},

	computed: {
		/**
		 * Filter actions by their `visible` predicate. Entries without
		 * `visible` are always shown (backwards compatible).
		 * @return {Array} Visible actions for the current targetItem.
		 */
		visibleActions() {
			return this.actions.filter((action) => {
				if (action.visible === undefined) return true
				if (typeof action.visible === 'function') {
					return !!action.visible(this.targetItem)
				}
				return !!action.visible
			})
		},
	},

	watch: {
		open(val) {
			this.internalOpen = val
		},
		internalOpen(val) {
			this.$emit('update:open', val)
		},
	},

	methods: {
		resolveDisabled(action) {
			if (typeof action.disabled === 'function') {
				return action.disabled(this.targetItem)
			}
			return !!action.disabled
		},

		/**
		 * Resolve the `title` field on an action descriptor — supports both
		 * a static string and a function `(targetItem) => string`. Returns
		 * undefined when no title is provided so the attribute isn't rendered.
		 *
		 * @param {object} action The action descriptor.
		 * @return {string|undefined} The tooltip text, or undefined.
		 */
		resolveTitle(action) {
			if (typeof action.title === 'function') {
				return action.title(this.targetItem) || undefined
			}
			return action.title || undefined
		},

		onAction(action) {
			if (action.handler && typeof action.handler === 'function') {
				action.handler(this.targetItem)
			}
			this.$emit('action', { action: action.label, row: this.targetItem })
		},

		onClose() {
			this.internalOpen = false
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-context-menu {
	/* Hide the NcActions trigger button — menu opens only via right-click */
	display: none;
}
</style>

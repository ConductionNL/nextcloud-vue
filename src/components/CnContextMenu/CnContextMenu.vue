<template>
	<NcActions
		:open.sync="internalOpen"
		:manual-open="true"
		:force-menu="true"
		class="cn-context-menu"
		container="body"
		data-testid="cn-context-menu"
		@close="onClose"
		@closed="onClosed">
		<!-- Dynamic actions from array prop -->
		<NcActionButton
			v-for="action in visibleActions"
			:key="action.label"
			:title="resolveTitle(action)"
			:disabled="resolveDisabled(action)"
			:class="{ 'cn-row-action--destructive': action.destructive }"
			:data-testid="`cn-action-item-${slugifyLabel(action.label)}`"
			close-after-click
			@click="onAction(action)">
			<template v-if="action.icon" #icon>
				<CnIcon v-if="typeof action.icon === 'string'" :name="action.icon" :size="20" />
				<component :is="action.icon" v-else :size="20" />
			</template>
			{{ action.label }}
		</NcActionButton>

		<!-- Custom content slot (for hardcoded buttons) -->
		<slot />
	</NcActions>
</template>

<script>
import { NcActionButton, NcActions } from '@nextcloud/vue'
import { clearContextMenuPositionDom } from '../../composables/useContextMenu.js'
import { CnIcon } from '../CnIcon/index.js'

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
 * ```vue
 * <CnContextMenu
 *   :open.sync="contextMenuOpen"
 *   :actions="mergedActions"
 *   :target-item="contextMenuRow"
 *   @action="$emit('action', $event)"
 *   @close="closeContextMenu" />
 * ```
 *
 * Custom buttons via slot (Doriath pattern)
 * ```vue
 * <CnContextMenu
 *   :open.sync="contextMenuOpen"
 *   @close="closeContextMenu">
 *   <NcActionButton close-after-click @click="onRename">
 *     <template #icon><PencilIcon :size="20" /></template>
 *     Rename
 *   </NcActionButton>
 * </CnContextMenu>
 * ```
 */
export default {
	name: 'CnContextMenu',

	components: {
		NcActions,
		NcActionButton,
		CnIcon,
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
		 * `icon` accepts either a component (rendered directly) or a string —
		 * a string is treated as an MDI name and rendered via `CnIcon` (e.g.
		 * `"Eye"`), which lets manifest (JSON) actions declare icons by name.
		 * `visible` (boolean | (targetItem) => boolean) hides the entry when falsy
		 * (default: shown). `title` (string | (targetItem) => string) renders as
		 * a native tooltip — useful for explaining why an entry is disabled.
		 * When the entire array is empty (or all entries are filtered out), only
		 * the default slot content is rendered.
		 *
		 * @type {Array<{label: string, icon: object | string, handler: Function, disabled: boolean | Function, visible: boolean | Function, title: string | Function, destructive: boolean}>}
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
		 *
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

	mounted() {
		// NcActions renders its own NcButton as the popover trigger; we open
		// this menu exclusively via right-click, so the button must be
		// invisible AND non-interactive. We can't use `display: none` because
		// NcPopover's a11y check (`tabbable(triggerContainer)[0]`) then finds
		// no tabbable element and warns "It looks like you are using a custom
		// button as a <NcPopover> trigger...". So we keep the button in the
		// tabbable tree via off-screen positioning (CSS below) and strip its
		// tabindex here so it never appears in the keyboard tab order.
		const trigger = this.$el?.querySelector('.action-item__menutoggle')
		if (trigger) {
			trigger.setAttribute('tabindex', '-1')
			trigger.setAttribute('aria-hidden', 'true')
		}
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

		/**
		 * Slugify an action label for use in stable `data-testid` selectors.
		 * Lowercase, kebab-case, strip non-alphanumeric. Used solely by the
		 * `:data-testid` binding on NcActionButton — does not affect runtime
		 * behaviour or rendered text.
		 *
		 * @param {string} label The action's display label.
		 * @return {string} kebab-case slug suitable for a testid suffix.
		 */
		slugifyLabel(label) {
			return String(label || '')
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
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

		/**
		 * Fired by NcActions after the popper's hide animation completes
		 * (`@closed` → NcPopover's `after-hide`). We clear the cursor-position
		 * CSS vars + data attribute here so the transform stays applied for the
		 * full duration of the animation — clearing it earlier would snap the
		 * popper to ≈ 0,0 for one frame before unmount.
		 */
		onClosed() {
			clearContextMenuPositionDom()
			this.$emit('closed')
		},
	},
}
</script>

<style scoped>
.cn-context-menu {
	/* Hide the NcActions trigger button — menu opens only via right-click.
	   Off-screen rather than display:none so NcPopover's a11y check still
	   finds the (now invisible) NcButton via tabbable() and skips its
	   "custom button as a <NcPopover> trigger" warning. */
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0 0 0 0);
	pointer-events: none;
}
</style>

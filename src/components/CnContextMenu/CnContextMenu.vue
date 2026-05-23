<template>
	<div class="cn-context-menu-root">
		<!-- DEFAULT PANEL — existing NcActions path (unchanged behaviour) -->
		<NcActions
			v-if="!activePanel"
			:open.sync="internalOpen"
			:manual-open="true"
			:force-menu="true"
			class="cn-context-menu"
			container="body"
			data-testid="cn-context-menu"
			@close="onClose">
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
					<component :is="action.icon" :size="20" />
				</template>
				{{ action.label }}
			</NcActionButton>

			<!-- @slot default Custom NcActionButton-family content for the default
			     panel. Rendered inside NcActions after any `actions` array items.
			     Subject to NcActions' child filter (NcActionButton,
			     NcActionButtonGroup, NcActionInput, NcActionLink, NcActionRouter,
			     NcActionCheckbox, NcActionRadio, NcActionTextEditable). Use a
			     custom panel slot for anything else. -->
			<slot />
		</NcActions>

		<!-- CUSTOM PANEL — bypass NcActions, render arbitrary slot content
		     anchored at the cursor. The `#panel:<name>` slot may contain any
		     markup (grids, inputs, custom components) without the NcActions
		     child-allowlist filter. -->
		<template v-if="activePanel && internalOpen">
			<div
				class="cn-context-menu__backdrop"
				@click="onClose"
				@contextmenu.prevent="onClose" />
			<div
				ref="panel"
				class="cn-context-menu__panel"
				role="menu"
				tabindex="-1"
				data-testid="cn-context-menu-panel"
				:data-panel="activePanel"
				@keydown.esc.stop="onClose"
				@click.stop>
				<!-- @slot panel:<name> Free-form custom panel content shown when
				     `activePanel === '<name>'`. Bypasses the NcActions child
				     allowlist — put any markup here (grids, inputs, custom
				     components, etc.). The slot name is dynamic: define one
				     `#panel:<name>` per panel you want to support. -->
				<!-- @binding {Function} back Clear `activePanel`, returning to the default action list. -->
				<!-- @binding {Function} close Close the entire menu, equivalent to clicking outside. -->
				<!-- @binding {*} targetItem The right-clicked item, forwarded from the `targetItem` prop. -->
				<slot
					:name="`panel:${activePanel}`"
					:back="back"
					:close="onClose"
					:target-item="targetItem" />
			</div>
		</template>
	</div>
</template>

<script>
import { NcActions, NcActionButton } from '@nextcloud/vue'

/**
 * CnContextMenu — Right-click context menu wrapper around NcActions, with an
 * optional panels API for arbitrary custom content.
 *
 * **Default panel** (no `activePanel`) renders an `NcActions` popover with an
 * action list, fed by the `actions` prop and/or the default slot — same
 * behaviour as before. `NcActions` filters its slot children to
 * `NcActionButton`-family components, so the default slot is for action items
 * only.
 *
 * **Custom panels** (`activePanel="<name>"`) bypass `NcActions` and render the
 * matching `#panel:<name>` slot inside a popover anchored at the cursor.
 * Custom panel slots may contain any markup — grids, inputs, custom
 * components, anything. Use this for submenu-style flows (icon pickers,
 * colour pickers, mini-forms) without fighting the action-list allowlist.
 *
 * Pair with `useContextMenu()` for cursor positioning + open/close state.
 *
 * Dynamic actions (CnIndexPage pattern)
 * ```vue
 * <CnContextMenu
 *   :open.sync="contextMenuOpen"
 *   :actions="mergedActions"
 *   :target-item="contextMenuRow"
 *   \@action="$emit('action', $event)"
 *   \@close="closeContextMenu" />
 * ```
 *
 * Custom buttons via default slot
 * ```vue
 * <CnContextMenu
 *   :open.sync="contextMenuOpen"
 *   \@close="closeContextMenu">
 *   <NcActionButton close-after-click \@click="onRename">
 *     <template #icon><PencilIcon :size="20" /></template>
 *     Rename
 *   </NcActionButton>
 * </CnContextMenu>
 * ```
 *
 * Panels (free-form custom content)
 * ```vue
 * <CnContextMenu
 *   :open.sync="open"
 *   :active-panel.sync="panel"
 *   \@close="close">
 *   <NcActionButton \@click="panel = 'colour'">Change colour</NcActionButton>
 *
 *   <template #panel:colour="{ back, close: closeMenu }">
 *     <button \@click="back">← Back</button>
 *     <div class="colour-grid">
 *       <button
 *         v-for="c in colours"
 *         :key="c"
 *         :style="{ background: c }"
 *         \@click="applyColour(c); closeMenu()" />
 *     </div>
 *   </template>
 * </CnContextMenu>
 * ```
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
		 * Action definitions rendered as NcActionButton items in the default
		 * panel.
		 * Same format as CnRowActions: `{ label, icon?, handler?, disabled?, visible?, title?, destructive? }`.
		 * `visible` (boolean | (targetItem) => boolean) hides the entry when falsy
		 * (default: shown). `title` (string | (targetItem) => string) renders as
		 * a native tooltip — useful for explaining why an entry is disabled.
		 * When the entire array is empty (or all entries are filtered out), only
		 * the default slot content is rendered.
		 * @type {Array<{label: string, icon: object, handler: Function, disabled: boolean | Function, visible: boolean | Function, title: string | Function, destructive: boolean}>}
		 */
		actions: {
			type: Array,
			default: () => [],
		},
		/**
		 * The right-clicked item (row, folder, etc.). Passed to action `handler`
		 * and `disabled` callbacks, included in the `action` event payload, and
		 * forwarded to custom panel slot scope as `targetItem`.
		 * Bind to `useContextMenu().targetItem`.
		 */
		targetItem: {
			type: [Object, String, Number],
			default: null,
		},

		/**
		 * Name of the currently active custom panel, or `null` for the default
		 * NcActions action list. When set, the matching `#panel:<name>` slot is
		 * rendered in place of the action list. Use with `.sync` to let panel
		 * slots call `back()` to clear it. Closing the menu auto-resets to
		 * `null` so the next open starts on the default panel.
		 */
		activePanel: {
			type: String,
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

		activePanel(val) {
			// Autofocus the panel container so Escape works without a manual click.
			if (val && this.internalOpen) {
				this.$nextTick(() => {
					this.$refs.panel?.focus()
				})
			}
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
			// Build the slug in a single linear pass: lowercase, fold
			// non-[a-z0-9] runs into a single '-', then strip leading/trailing
			// dashes by index instead of by regex (codeql js/redos).
			const lower = String(label || '').toLowerCase()
			let out = ''
			let lastWasDash = false
			for (let i = 0; i < lower.length; i++) {
				const c = lower.charCodeAt(i)
				const isAlnum = (c >= 48 && c <= 57) || (c >= 97 && c <= 122)
				if (isAlnum) {
					out += lower[i]
					lastWasDash = false
				} else if (!lastWasDash) {
					out += '-'
					lastWasDash = true
				}
			}
			let start = 0
			let end = out.length
			while (start < end && out.charCodeAt(start) === 45) start++
			while (end > start && out.charCodeAt(end - 1) === 45) end--
			return out.slice(start, end)
		},

		onAction(action) {
			if (action.handler && typeof action.handler === 'function') {
				action.handler(this.targetItem)
			}
			this.$emit('action', { action: action.label, row: this.targetItem })
		},

		onClose() {
			this.internalOpen = false
			if (this.activePanel) {
				this.$emit('update:activePanel', null)
			}
			/**
			 * @event close Emitted when the menu closes — fired for any close
			 * cause: clicking an action, clicking outside, clicking the panel
			 * backdrop, or pressing Escape.
			 * @type {undefined}
			 */
			this.$emit('close')
		},

		/**
		 * Clear the active panel and return to the default action list.
		 * Exposed to custom panel slots via the `back` scope binding.
		 */
		back() {
			this.$emit('update:activePanel', null)
		},
	},
}
</script>

<style scoped>
.cn-context-menu {
	/* Hide the NcActions trigger button — menu opens only via right-click */
	display: none;
}

.cn-context-menu__backdrop {
	position: fixed;
	inset: 0;
	z-index: 9998;
}

.cn-context-menu__panel {
	position: fixed;
	top: var(--cn-ctx-menu-y, 0);
	left: var(--cn-ctx-menu-x, 0);
	z-index: 9999;
	min-width: 220px;
	padding: 4px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
	outline: none;
}
</style>

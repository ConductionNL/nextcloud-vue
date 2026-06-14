<template>
	<div class="cn-context-menu-root">
		<NcActions
			v-if="!activePanel"
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

			<!--
			@slot default
			@description Custom NcActionButton-family content rendered inside the
			NcActions menu. Use this for hardcoded buttons (Doriath pattern) when
			the `actions` prop is empty.
		-->
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

		/**
		 * Name of the currently-active custom panel. When set (and the menu is
		 * open), the default NcActions list is replaced by the matching
		 * `#panel:<name>` slot, rendered free-form (no NcActions child filter).
		 * Use with `.sync` — the component emits `update:activePanel(null)` when
		 * the panel's `back()` binding is invoked or the menu closes.
		 *
		 * @type {string|null}
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
			/**
			 * @event update:open Fired whenever the menu's internal open state flips. Used by callers that bind `:open.sync` to track visibility.
			 * @type {boolean}
			 */
			this.$emit('update:open', val)
		},
	},

	mounted() {
		// NcActions renders its own NcButton as the popover trigger; the menu
		// opens only via right-click, so the button is offscreen-positioned
		// (see the `.cn-context-menu` rule below). aria-hidden hides it from
		// screen readers.
		const trigger = this.$el?.querySelector('.action-item__menutoggle')
		if (trigger) {
			trigger.setAttribute('aria-hidden', 'true')
		}

		// Silence NcPopover's dev-mode a11y warning for this specific instance.
		//
		// NcPopover (when `window.OC?.debug` is on) calls
		// `tabbable(triggerContainer)[0]` on every open and warns
		// "It looks like you are using a custom button as a <NcPopover>
		// trigger…" if nothing tabbable is found. We *are* using NcButton —
		// the warning's escape hatch — but the button is offscreen-positioned
		// and tabbable's visibility checks won't reliably find it across
		// browsers (Chromium's `Element.checkVisibility()` excludes some
		// offscreen / clipped elements). The advice in the warning ("bind
		// #trigger slot attrs") doesn't apply: NcActions controls its own
		// trigger and doesn't expose a `#trigger` slot to override.
		//
		// Neutralising the check on our own NcPopover instance (one level
		// down inside NcActions) leaves every other popover untouched and
		// keeps the check live for real custom triggers elsewhere.
		const ncActions = this.$children?.[0]
		const ncPopover = ncActions?.$refs?.popover
		if (ncPopover) {
			ncPopover.checkTriggerA11y = () => {}
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
			/**
			 * @event action User picked an entry from the menu. The action's own `handler(targetItem)` (when present) ran synchronously before this event fires; the event lets parents observe / log the choice.
			 * @type {{ action: string, row: object|null }}
			 */
			this.$emit('action', { action: action.label, row: this.targetItem })
		},

		onClose() {
			this.internalOpen = false
			if (this.activePanel) {
				this.$emit('update:activePanel', null)
			}
			/**
			 * @event close Fired when the menu starts closing (before the popper's hide animation). Use `@closed` for the post-animation point.
			 */
			this.$emit('close')
		},

		/**
		 * Clear the active panel and return to the default action list.
		 * Exposed to custom panel slots via the `back` scope binding.
		 */
		back() {
			/**
			 * @event update:activePanel Emitted with `null` to clear the active panel — fired by the panel's `back()` binding and whenever the menu closes while a panel is open. Bind with `:active-panel.sync`.
			 * @type {null}
			 */
			this.$emit('update:activePanel', null)
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
			/**
			 * @event closed Fired after the popper's hide animation completes. Use this (rather than `@close`) when the parent needs the menu's DOM to be gone before doing the next thing.
			 */
			this.$emit('closed')
		},
	},
}
</script>

<style scoped>
.cn-context-menu {
	/* Hide the NcActions trigger button — menu opens only via right-click.
	   Off-screen rather than display:none / visibility:hidden so NcPopover's
	   a11y check (`tabbable(triggerContainer)[0]`) still finds the NcButton
	   and the "custom button as a <NcPopover> trigger" warning stays quiet.
	   Avoid `clip` / `clip-path` here — modern browsers' `Element.checkVisibility()`,
	   which tabbable calls into, treats those as invisible. Pure offscreen
	   positioning leaves the element fully "visible" to layout while being
	   off the user's screen. */
	position: absolute;
	top: -9999px;
	left: -9999px;
	opacity: 0;
	pointer-events: none;
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

import { onBeforeUnmount, ref } from 'vue'

export const CTX_MENU_CSS_VAR_X = '--cn-ctx-menu-x'
export const CTX_MENU_CSS_VAR_Y = '--cn-ctx-menu-y'
export const CTX_MENU_DATA_ATTR = 'data-cn-ctx-menu'

// Internal aliases — keep the original short names for the existing code below.
const CSS_VAR_X = CTX_MENU_CSS_VAR_X
const CSS_VAR_Y = CTX_MENU_CSS_VAR_Y
const DATA_ATTR = CTX_MENU_DATA_ATTR

/**
 * Strip the position CSS vars + data attribute from `<html>`.
 *
 * Exposed so `CnContextMenu` can drive cleanup off NcActions' real
 * `@closed` event (which fires *after* the popper's hide animation), instead
 * of the composable guessing a duration. The composable owns set-up in
 * `open()`; the consumer's `<CnContextMenu>` owns tear-down via this helper.
 */
export function clearContextMenuPositionDom() {
	document.documentElement.style.removeProperty(CSS_VAR_X)
	document.documentElement.style.removeProperty(CSS_VAR_Y)
	document.documentElement.removeAttribute(DATA_ATTR)
}

/**
 * Composable for managing a right-click context menu positioned at the cursor.
 *
 * Handles cursor-based positioning through CSS custom properties and a data
 * attribute on `document.documentElement`. The `<NcActions>` template stays in
 * the consuming component — this composable only manages open/close state,
 * the target item reference, and action helpers.
 *
 * Pair with the shared CSS in `src/css/context-menu.css` (auto-imported via
 * `src/css/index.css`) which overrides `.v-popper__popper` transforms when
 * the data attribute is present.
 *
 * @example In a Vue Options API component with setup()
 * ```js
 * import { useContextMenu } from '@conduction/nextcloud-vue'
 *
 * export default {
 *   setup() {
 *     const ctx = useContextMenu()
 *     return {
 *       contextMenuOpen: ctx.isOpen,
 *       contextMenuRow: ctx.targetItem,
 *       openContextMenu: ctx.open,
 *       closeContextMenu: ctx.close,
 *       isContextActionDisabled: ctx.isActionDisabled,
 *       triggerContextAction: ctx.triggerAction,
 *     }
 *   },
 * }
 * ```
 *
 * @return {{
 *   isOpen: import('vue').Ref<boolean>,
 *   targetItem: import('vue').Ref<any>,
 *   open: (params: { item: any, event: MouseEvent }) => void,
 *   close: () => void,
 *   isActionDisabled: (action: { disabled?: boolean | ((item: any) => boolean) }) => boolean,
 *   triggerAction: (action: { label: string, handler?: (item: any) => void }) => { action: string, row: any },
 * }}
 */
export function useContextMenu() {
	const isOpen = ref(false)
	const targetItem = ref(null)

	/**
	 * Open the context menu at the cursor position.
	 *
	 * Sets CSS custom properties for x/y coordinates and a data attribute on
	 * `document.documentElement` so the shared CSS can override Popper positioning.
	 *
	 * @param {object} params - Context menu trigger parameters.
	 * @param {any} params.item The item associated with the right-click (row, folder, etc.)
	 * @param {MouseEvent} params.event The native contextmenu event
	 */
	function open({ item, event }) {
		document.documentElement.style.setProperty(CSS_VAR_X, event.clientX + 'px')
		document.documentElement.style.setProperty(CSS_VAR_Y, event.clientY + 'px')
		document.documentElement.setAttribute(DATA_ATTR, '')
		targetItem.value = item
		isOpen.value = true
	}

	/**
	 * Close the context menu.
	 *
	 * Only flips reactive state — the DOM cleanup (CSS vars + data attribute)
	 * is driven by `CnContextMenu`'s `@closed` listener on NcActions, which
	 * fires *after* the popper's hide animation completes. Removing the data
	 * attribute synchronously here would strip the cursor-positioning
	 * transform mid-animation and the popper would snap to ≈ 0,0 for one
	 * frame before unmounting.
	 *
	 * Use as the `@close` handler on `<NcActions>` / `<CnContextMenu>`.
	 */
	function close() {
		isOpen.value = false
		targetItem.value = null
	}

	/**
	 * Resolve whether an action is disabled for the current target item.
	 * Supports both a static boolean and a function `(item) => boolean`.
	 *
	 * @param {object} action Action definition with optional `disabled` field
	 * @return {boolean}
	 */
	function isActionDisabled(action) {
		if (typeof action.disabled === 'function') {
			return action.disabled(targetItem.value)
		}
		return !!action.disabled
	}

	/**
	 * Execute a context menu action.
	 *
	 * Calls `action.handler(targetItem)` if a handler exists, then returns a
	 * payload object the caller can pass to `$emit('action', payload)`.
	 *
	 * @param {object} action Action definition with `label` and optional `handler`
	 * @return {{ action: string, row: any }}
	 */
	function triggerAction(action) {
		if (action.handler && typeof action.handler === 'function') {
			action.handler(targetItem.value)
		}
		return { action: action.label, row: targetItem.value }
	}

	// Clean up DOM if the component unmounts while the menu is open —
	// CnContextMenu's `@closed` listener would otherwise never fire because
	// NcActions has already been torn down.
	onBeforeUnmount(() => {
		isOpen.value = false
		targetItem.value = null
		clearContextMenuPositionDom()
	})

	return {
		isOpen,
		targetItem,
		open,
		close,
		isActionDisabled,
		triggerAction,
	}
}

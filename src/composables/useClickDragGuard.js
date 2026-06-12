/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * useClickDragGuard — tell a deliberate click apart from a text-selection drag.
 *
 * A row or card whose body toggles selection on click must NOT toggle when the
 * user is actually dragging to select text (a drag also fires a `click` at the
 * end). This guard records the pointer position on `mousedown` and, on the
 * following `click`, reports whether the pointer travelled far enough to be a
 * drag rather than a click.
 *
 * Shared by `CnDataTable` (row click) and `CnObjectCard` (card click).
 *
 * @module composables/useClickDragGuard
 */

/**
 * Maximum pointer travel (in px, between mousedown and click) still treated as
 * a deliberate click. Beyond this the gesture is a text-selection drag and the
 * select-on-click is suppressed.
 */
export const CLICK_DRAG_THRESHOLD = 6

/**
 * Create a per-instance click-vs-drag guard.
 *
 * The start position is held in a closure (not reactive) — it never feeds the
 * render, so it doesn't belong in `data()`. Designed for Options API use:
 * spread the returned members into `setup()`'s return so the template can bind
 * `@mousedown="onPointerDown"` and methods can call `this.wasDrag(event)`.
 *
 * @return {{ onPointerDown: (event: MouseEvent) => void, wasDrag: (event?: MouseEvent) => boolean }}
 *   `onPointerDown` records where a press started; `wasDrag` returns whether the
 *   pointer moved past `CLICK_DRAG_THRESHOLD` since then (consuming the stored
 *   position).
 *
 * @example
 *   // Options API component:
 *   import { useClickDragGuard } from '@conduction/nextcloud-vue'
 *   export default {
 *     setup() {
 *       return useClickDragGuard()
 *     },
 *     methods: {
 *       onCardClick(event) {
 *         if (this.wasDrag(event)) return
 *         this.$emit('select', this.object)
 *       },
 *     },
 *   }
 */
export function useClickDragGuard() {
	let start = null

	/**
	 * Remember where a press started, to tell a click from a drag.
	 *
	 * @param {MouseEvent} event The mousedown event.
	 */
	function onPointerDown(event) {
		start = { x: event.clientX, y: event.clientY }
	}

	/**
	 * True when the pointer moved past the threshold since mousedown (a
	 * text-selection drag, not a click). Consumes the stored start position.
	 *
	 * @param {MouseEvent} [event] The click event.
	 * @return {boolean} Whether the gesture was a drag.
	 */
	function wasDrag(event) {
		const from = start
		start = null
		if (!from || !event) return false
		return Math.hypot(event.clientX - from.x, event.clientY - from.y) > CLICK_DRAG_THRESHOLD
	}

	return { onPointerDown, wasDrag }
}

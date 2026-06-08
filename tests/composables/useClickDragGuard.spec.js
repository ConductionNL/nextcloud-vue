/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for useClickDragGuard() — distinguishes a deliberate click from a
 * text-selection drag, shared by CnDataTable (rows) and CnObjectCard (cards).
 */

import { useClickDragGuard, CLICK_DRAG_THRESHOLD } from '../../src/composables/useClickDragGuard.js'

describe('useClickDragGuard', () => {
	it('treats a click with no preceding mousedown as not-a-drag', () => {
		const { wasDrag } = useClickDragGuard()
		expect(wasDrag({ clientX: 5, clientY: 5 })).toBe(false)
	})

	it('treats a click missing entirely as not-a-drag', () => {
		const { onPointerDown, wasDrag } = useClickDragGuard()
		onPointerDown({ clientX: 0, clientY: 0 })
		expect(wasDrag()).toBe(false)
	})

	it('reports a drag when the pointer travels past the threshold', () => {
		const { onPointerDown, wasDrag } = useClickDragGuard()
		onPointerDown({ clientX: 10, clientY: 10 })
		expect(wasDrag({ clientX: 10 + CLICK_DRAG_THRESHOLD + 1, clientY: 10 })).toBe(true)
	})

	it('reports a click when the pointer barely moves', () => {
		const { onPointerDown, wasDrag } = useClickDragGuard()
		onPointerDown({ clientX: 10, clientY: 10 })
		expect(wasDrag({ clientX: 12, clientY: 11 })).toBe(false)
	})

	it('consumes the stored start position so a second click is not a drag', () => {
		const { onPointerDown, wasDrag } = useClickDragGuard()
		onPointerDown({ clientX: 0, clientY: 0 })
		expect(wasDrag({ clientX: 100, clientY: 100 })).toBe(true)
		// no fresh mousedown — the start is gone, so this is not a drag
		expect(wasDrag({ clientX: 200, clientY: 200 })).toBe(false)
	})

	it('keeps separate state per instance', () => {
		const a = useClickDragGuard()
		const b = useClickDragGuard()
		a.onPointerDown({ clientX: 0, clientY: 0 })
		// b never saw a mousedown, so its click is not a drag
		expect(b.wasDrag({ clientX: 100, clientY: 100 })).toBe(false)
		// a still has its start recorded
		expect(a.wasDrag({ clientX: 100, clientY: 100 })).toBe(true)
	})
})

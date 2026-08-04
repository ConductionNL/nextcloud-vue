/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for createManifestEditHistory — bounded snapshot undo/redo stack.
 *
 * Covers the manifest-edit-history capability:
 * - bounded stack: push/read-back, limit eviction, default limit
 * - undo/redo traversal with canUndo/canRedo flags
 * - branch discard (push after undo drops the redo tail)
 * - coalescing via an injectable clock + label match
 * - clone/freeze/no-op immutability discipline
 * - clear()
 */

const { createManifestEditHistory } = require('../../src/utils/manifestEditHistory.js')

describe('createManifestEditHistory', () => {
	describe('bounded stack', () => {
		it('pushes and reads back the current state', () => {
			const history = createManifestEditHistory()
			const s1 = { pages: [{ id: 'a', title: 'A' }] }
			history.push(s1)

			expect(history.current).toEqual(s1)
			expect(history.size).toBe(1)
			expect(history.canUndo).toBe(false)
		})

		it('evicts the oldest entry once the limit is exceeded', () => {
			const history = createManifestEditHistory({ limit: 3 })
			const s1 = { v: 1 }
			const s2 = { v: 2 }
			const s3 = { v: 3 }
			const s4 = { v: 4 }
			history.push(s1)
			history.push(s2)
			history.push(s3)
			history.push(s4)

			expect(history.size).toBe(3)
			expect(history.undo()).toEqual(s3)
			expect(history.undo()).toEqual(s2)
			expect(history.undo()).toBeNull()
		})

		it('defaults the limit to 100', () => {
			const history = createManifestEditHistory()
			for (let i = 0; i < 101; i++) {
				history.push({ v: i })
			}
			expect(history.size).toBe(100)
		})
	})

	describe('undo/redo traversal', () => {
		it('undo returns the previous snapshot', () => {
			const history = createManifestEditHistory()
			const s1 = { v: 1 }
			const s2 = { v: 2 }
			history.push(s1)
			history.push(s2)

			expect(history.undo()).toEqual(s1)
			expect(history.current).toEqual(s1)
			expect(history.canUndo).toBe(false)
			expect(history.canRedo).toBe(true)
		})

		it('redo restores the undone snapshot', () => {
			const history = createManifestEditHistory()
			const s1 = { v: 1 }
			const s2 = { v: 2 }
			history.push(s1)
			history.push(s2)
			history.undo()

			expect(history.redo()).toEqual(s2)
			expect(history.canRedo).toBe(false)
			expect(history.canUndo).toBe(true)
		})

		it('undo at the bottom is a null no-op', () => {
			const history = createManifestEditHistory()
			history.push({ v: 1 })

			const sizeBefore = history.size
			const currentBefore = history.current
			expect(history.undo()).toBeNull()
			expect(history.current).toEqual(currentBefore)
			expect(history.size).toBe(sizeBefore)
		})

		it('redo with no tail is a null no-op', () => {
			const history = createManifestEditHistory()
			history.push({ v: 1 })

			const currentBefore = history.current
			expect(history.redo()).toBeNull()
			expect(history.current).toEqual(currentBefore)
		})

		it('walks interleaved undo/redo deterministically', () => {
			const history = createManifestEditHistory()
			const s1 = { v: 1 }
			const s2 = { v: 2 }
			const s3 = { v: 3 }
			history.push(s1)
			history.push(s2)
			history.push(s3)
			history.undo()
			history.undo()
			history.redo()

			expect(history.current).toEqual(s2)
			expect(history.canUndo).toBe(true)
			expect(history.canRedo).toBe(true)
		})
	})

	describe('branch discard', () => {
		it('discards the redo tail on push after undo', () => {
			const history = createManifestEditHistory()
			const s1 = { v: 1 }
			const s2 = { v: 2 }
			const s3 = { v: 3 }
			const s4 = { v: 4 }
			history.push(s1)
			history.push(s2)
			history.push(s3)
			history.undo()
			history.undo()
			history.push(s4)

			expect(history.canRedo).toBe(false)
			expect(history.current).toEqual(s4)
			expect(history.undo()).toEqual(s1)

			// s2 and s3 are unreachable: redo from the bottom only ever reaches s4.
			expect(history.redo()).toEqual(s4)
			expect(history.redo()).toBeNull()
		})
	})

	describe('coalescing', () => {
		it('merges same-label pushes inside the window', () => {
			let t = 0
			const history = createManifestEditHistory({ coalesceMs: 500, now: () => t })
			const s1 = { title: 'A' }
			const s2 = { title: 'AB' }
			history.push(s1, 'edit:title')
			t += 100
			history.push(s2, 'edit:title')

			expect(history.size).toBe(1)
			expect(history.current).toEqual(s2)
			expect(history.canUndo).toBe(false)
		})

		it('never coalesces pushes with different labels', () => {
			let t = 0
			const history = createManifestEditHistory({ coalesceMs: 500, now: () => t })
			const s1 = { v: 1 }
			const s2 = { v: 2 }
			history.push(s1, 'edit:title')
			t += 100
			history.push(s2, 'move:widget')

			expect(history.size).toBe(2)
			expect(history.undo()).toEqual(s1)
		})

		it('appends pushes outside the coalescing window', () => {
			let t = 0
			const history = createManifestEditHistory({ coalesceMs: 500, now: () => t })
			history.push({ v: 1 }, 'edit:title')
			t += 600
			history.push({ v: 2 }, 'edit:title')

			expect(history.size).toBe(2)
		})

		it('is disabled by default (coalesceMs: 0)', () => {
			const history = createManifestEditHistory()
			history.push({ v: 1 }, 'edit:title')
			history.push({ v: 2 }, 'edit:title')

			expect(history.size).toBe(2)
		})

		it('breaks a coalescing run when an undo intervenes', () => {
			let t = 0
			const history = createManifestEditHistory({ coalesceMs: 500, now: () => t })
			const s0 = { v: 0 }
			const s1 = { v: 1 }
			const s2 = { v: 2 }
			history.push(s0)
			t += 50
			history.push(s1, 'edit:title')
			history.undo()
			t += 50
			history.push(s2, 'edit:title')

			expect(history.current).toEqual(s2)
			expect(history.undo()).toEqual(s0)
		})
	})

	describe('clone + freeze + immutability', () => {
		it('is unaffected by mutating the source object after push', () => {
			const history = createManifestEditHistory()
			const source = { nested: { count: 1 } }
			history.push(source)
			source.nested.count = 999

			expect(history.current).toEqual({ nested: { count: 1 } })
		})

		it('returns deep-frozen snapshots (root and nested)', () => {
			const history = createManifestEditHistory()
			history.push({ nested: { count: 1 } })

			const current = history.current
			expect(Object.isFrozen(current)).toBe(true)
			expect(Object.isFrozen(current.nested)).toBe(true)

			expect(() => {
				current.nested.count = 42
			}).toThrow()
			expect(history.current.nested.count).toBe(1)
		})

		it('is a no-op when the pushed state deep-equals current', () => {
			const history = createManifestEditHistory()
			history.push({ v: 1 })
			history.push({ v: 1 })

			expect(history.size).toBe(1)
		})

		it('shares unchanged subtrees by reference across consecutive snapshots', () => {
			const history = createManifestEditHistory()
			const shared = { widgetKey: 'chart', config: { x: 1 } }
			history.push({ pages: [{ id: 'a', title: 'A', widget: shared }] })
			history.push({ pages: [{ id: 'a', title: 'A2', widget: shared }] })

			const first = history.undo()
			const second = history.redo()
			expect(first.pages[0].widget).toBe(second.pages[0].widget)
		})
	})

	describe('clear', () => {
		it('empties a populated history', () => {
			const history = createManifestEditHistory()
			history.push({ v: 1 })
			history.push({ v: 2 })
			history.undo()

			history.clear()

			expect(history.size).toBe(0)
			expect(history.current).toBeNull()
			expect(history.canUndo).toBe(false)
			expect(history.canRedo).toBe(false)
		})

		it('behaves like a fresh history after clear', () => {
			const history = createManifestEditHistory()
			history.push({ v: 1 })
			history.clear()

			const s1 = { v: 'fresh' }
			history.push(s1)
			expect(history.current).toEqual(s1)
			expect(history.size).toBe(1)
			expect(history.canUndo).toBe(false)
		})
	})
})

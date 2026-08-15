/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for useManifestEditHistory — reactive Vue 2.7 wrapper around
 * createManifestEditHistory.
 *
 * Covers the manifest-edit-history capability:
 * - reactive canUndo/canRedo/current refs update across push/undo
 * - options (e.g. limit) delegate to the core util unchanged
 * - barrel-export resolution from src/index.js
 */

const { useManifestEditHistory } = require('../../src/composables/useManifestEditHistory.js')

describe('useManifestEditHistory', () => {
	it('updates reactive flags across push and undo', () => {
		const history = useManifestEditHistory()
		const s1 = { v: 1 }
		const s2 = { v: 2 }

		history.push(s1)
		history.push(s2)
		expect(history.canUndo.value).toBe(true)
		expect(history.canRedo.value).toBe(false)

		history.undo()
		expect(history.canUndo.value).toBe(false)
		expect(history.canRedo.value).toBe(true)
		expect(history.current.value).toEqual(s1)
	})

	it('delegates limit eviction to the core util', () => {
		const history = useManifestEditHistory({ limit: 2 })
		history.push({ v: 1 })
		history.push({ v: 2 })
		history.push({ v: 3 })

		expect(history.size.value).toBe(2)
	})

	it('reflects redo and clear through the reactive refs', () => {
		const history = useManifestEditHistory()
		history.push({ v: 1 })
		history.push({ v: 2 })
		history.undo()
		history.redo()

		expect(history.current.value).toEqual({ v: 2 })
		expect(history.canRedo.value).toBe(false)

		history.clear()
		expect(history.size.value).toBe(0)
		expect(history.current.value).toBeNull()
		expect(history.canUndo.value).toBe(false)
		expect(history.canRedo.value).toBe(false)
	})
})

describe('barrel exports', () => {
	it('resolves createManifestEditHistory and useManifestEditHistory from the library barrel', () => {
		const {
			createManifestEditHistory,
			useManifestEditHistory: useManifestEditHistoryFromBarrel,
		} = require('../../src/index.js')

		expect(typeof createManifestEditHistory).toBe('function')
		expect(typeof useManifestEditHistoryFromBarrel).toBe('function')
	})
})

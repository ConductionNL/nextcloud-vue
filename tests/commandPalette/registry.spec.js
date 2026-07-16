/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { createCommandRegistry, commandPaletteRegistry } from '@/commandPalette/registry.js'

describe('commandPalette/registry — createCommandRegistry', () => {
	let registry

	beforeEach(() => {
		registry = createCommandRegistry()
	})

	it('registers a command and returns the normalised entry', () => {
		const run = () => {}
		const entry = registry.register({ id: 'x', title: 'Do X', run })
		expect(entry).toMatchObject({ id: 'x', title: 'Do X', section: 'Actions', order: 100, keywords: [], icon: null })
		expect(entry.run).toBe(run)
	})

	it('lists registered commands sorted by order then title', () => {
		registry.register({ id: 'b', title: 'Beta', run: () => {}, order: 50 })
		registry.register({ id: 'a', title: 'Alpha', run: () => {}, order: 50 })
		registry.register({ id: 'z', title: 'Zeta', run: () => {}, order: 10 })
		expect(registry.list().map((c) => c.id)).toEqual(['z', 'a', 'b'])
	})

	it('upserts on a duplicate id instead of throwing', () => {
		registry.register({ id: 'dup', title: 'First', run: () => {} })
		registry.register({ id: 'dup', title: 'Second', run: () => {} })
		expect(registry.list()).toHaveLength(1)
		expect(registry.get('dup').title).toBe('Second')
	})

	it('unregisters a command', () => {
		registry.register({ id: 'x', title: 'X', run: () => {} })
		expect(registry.unregister('x')).toBe(true)
		expect(registry.has('x')).toBe(false)
		expect(registry.unregister('x')).toBe(false)
	})

	it('notifies onChange subscribers on register and unregister', () => {
		const listener = jest.fn()
		const unsubscribe = registry.onChange(listener)
		registry.register({ id: 'x', title: 'X', run: () => {} })
		expect(listener).toHaveBeenCalledTimes(1)
		expect(listener.mock.calls[0][0]).toHaveLength(1)
		registry.unregister('x')
		expect(listener).toHaveBeenCalledTimes(2)
		unsubscribe()
		registry.register({ id: 'y', title: 'Y', run: () => {} })
		expect(listener).toHaveBeenCalledTimes(2)
	})

	it('throws on a missing id, title, or run', () => {
		expect(() => registry.register({ title: 'X', run: () => {} })).toThrow()
		expect(() => registry.register({ id: 'x', run: () => {} })).toThrow()
		expect(() => registry.register({ id: 'x', title: 'X' })).toThrow()
		expect(() => registry.register(null)).toThrow()
	})

	it('__resetForTests clears every command but leaves subscriptions intact', () => {
		const listener = jest.fn()
		registry.onChange(listener)
		registry.register({ id: 'x', title: 'X', run: () => {} })
		registry.__resetForTests()
		expect(registry.list()).toEqual([])
		registry.register({ id: 'y', title: 'Y', run: () => {} })
		// register (1) + __resetForTests's own notify (1) + register (1) = 3.
		expect(listener).toHaveBeenCalledTimes(3)
		expect(listener).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'y' })]))
	})
})

describe('commandPalette/registry — commandPaletteRegistry singleton', () => {
	afterEach(() => {
		commandPaletteRegistry.__resetForTests()
	})

	it('is a shared, module-level instance', () => {
		commandPaletteRegistry.register({ id: 'shared', title: 'Shared', run: () => {} })
		expect(commandPaletteRegistry.has('shared')).toBe(true)
	})
})

/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { useCommandPalette } from '@/composables/useCommandPalette.js'
import { createCommandRegistry, commandPaletteRegistry } from '@/commandPalette/registry.js'

describe('useCommandPalette', () => {
	afterEach(() => {
		commandPaletteRegistry.__resetForTests()
		const cp = useCommandPalette()
		cp.state.isOpen = false
	})

	it('exposes open/close/toggle over a shared isOpen state', () => {
		const a = useCommandPalette()
		const b = useCommandPalette()
		expect(a.state).toBe(b.state) // same module singleton
		expect(a.state.isOpen).toBe(false)
		a.open()
		expect(b.state.isOpen).toBe(true)
		b.close()
		expect(a.state.isOpen).toBe(false)
		a.toggle()
		expect(b.state.isOpen).toBe(true)
		a.toggle()
		expect(b.state.isOpen).toBe(false)
	})

	it('register()/unregister() delegate to the default shared registry', () => {
		const cp = useCommandPalette()
		cp.register({ id: 'cmd', title: 'A command', run: () => {} })
		expect(commandPaletteRegistry.has('cmd')).toBe(true)
		expect(cp.commands.items.map((c) => c.id)).toContain('cmd')
		cp.unregister('cmd')
		expect(commandPaletteRegistry.has('cmd')).toBe(false)
	})

	it('commands stays reactive to registry changes without re-calling useCommandPalette()', () => {
		const cp = useCommandPalette()
		expect(cp.commands.items).toHaveLength(0)
		cp.register({ id: 'live', title: 'Live', run: () => {} })
		expect(cp.commands.items).toHaveLength(1)
	})

	it('supports an isolated registry override for test isolation', () => {
		const isolated = createCommandRegistry()
		const cp = useCommandPalette(isolated)
		cp.register({ id: 'only-here', title: 'Only here', run: () => {} })
		expect(isolated.has('only-here')).toBe(true)
		expect(commandPaletteRegistry.has('only-here')).toBe(false)
		expect(cp.commands.items.map((c) => c.id)).toEqual(['only-here'])
	})
})

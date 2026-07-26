/**
 * Tests for the pluggable integration registry.
 *
 * Covers AD-13 collision policy, AD-19 surface fallback, reactivity
 * via onChange(), and the install/replay queue mechanism on
 * `window.OCA.OpenRegister.integrations`.
 */

// Tab + widget stubs — the registry doesn't introspect them so any
// truthy value suffices.
const tab = { name: 'StubTab' }
const widget = { name: 'StubWidget' }
const widgetCompact = { name: 'StubWidgetCompact' }
const widgetExpanded = { name: 'StubWidgetExpanded' }
const widgetEntity = { name: 'StubWidgetEntity' }

describe('createIntegrationRegistry', () => {
	let createIntegrationRegistry

	beforeEach(() => {
		jest.isolateModules(() => {
			createIntegrationRegistry = require('../../src/integrations/registry.js').createIntegrationRegistry
		})
	})

	it('registers a valid entry and lists it', () => {
		const reg = createIntegrationRegistry()
		reg.register({ id: 'notes', label: 'Notes', tab, widget })
		const all = reg.list()
		expect(all).toHaveLength(1)
		expect(all[0].id).toBe('notes')
		expect(all[0].label).toBe('Notes')
		expect(all[0].order).toBe(100)
		expect(all[0].group).toBe(null)
	})

	it('sorts by order ascending then id ascending', () => {
		const reg = createIntegrationRegistry()
		reg.register({ id: 'zeta', label: 'Z', order: 5, tab, widget })
		reg.register({ id: 'alpha', label: 'A', order: 10, tab, widget })
		reg.register({ id: 'beta', label: 'B', order: 10, tab, widget })
		const ids = reg.list().map((p) => p.id)
		expect(ids).toEqual(['zeta', 'alpha', 'beta'])
	})

	it('throws when id is missing or empty', () => {
		const reg = createIntegrationRegistry()
		expect(() => reg.register({ label: 'x', tab, widget })).toThrow(/non-empty string `id`/)
		expect(() => reg.register({ id: '', label: 'x', tab, widget })).toThrow(/non-empty string `id`/)
	})

	it('throws when label is missing', () => {
		const reg = createIntegrationRegistry()
		expect(() => reg.register({ id: 'x', tab, widget })).toThrow(/`label`/)
	})

	it('throws when tab component is missing (parity gate)', () => {
		const reg = createIntegrationRegistry()
		expect(() => reg.register({ id: 'x', label: 'X', widget })).toThrow(/missing required `tab`/)
	})

	it('throws when widget component is missing (parity gate)', () => {
		const reg = createIntegrationRegistry()
		expect(() => reg.register({ id: 'x', label: 'X', tab })).toThrow(/missing required `widget`/)
	})

	it('throws on duplicate id in development mode (AD-13)', () => {
		const reg = createIntegrationRegistry()
		reg.register({ id: 'forms', label: 'Forms', tab, widget })
		expect(() => reg.register({ id: 'forms', label: 'Forms', tab, widget })).toThrow(/duplicate registration/)
	})

	it('resolves widget with surface fallback (AD-19)', () => {
		const reg = createIntegrationRegistry()
		reg.register({
			id: 'calendar',
			label: 'Calendar',
			tab,
			widget,
			widgetCompact,
			widgetExpanded,
		})
		expect(reg.resolveWidget('calendar', 'user-dashboard')).toBe(widgetCompact)
		expect(reg.resolveWidget('calendar', 'detail-page')).toBe(widgetExpanded)
		// app-dashboard has no override -> falls back to widget
		expect(reg.resolveWidget('calendar', 'app-dashboard')).toBe(widget)
		// single-entity has no override -> falls back to widget
		expect(reg.resolveWidget('calendar', 'single-entity')).toBe(widget)
	})

	it('resolves widgetEntity for single-entity surface when present', () => {
		const reg = createIntegrationRegistry()
		reg.register({ id: 'calendar', label: 'Calendar', tab, widget, widgetEntity })
		expect(reg.resolveWidget('calendar', 'single-entity')).toBe(widgetEntity)
	})

	it('returns null from resolveWidget for unknown id', () => {
		const reg = createIntegrationRegistry()
		expect(reg.resolveWidget('absent', 'detail-page')).toBe(null)
	})

	it('notifies onChange subscribers on register and unregister', () => {
		const reg = createIntegrationRegistry()
		const seen = []
		const unsubscribe = reg.onChange((snapshot) => seen.push(snapshot.map((p) => p.id)))
		reg.register({ id: 'a', label: 'A', tab, widget })
		reg.register({ id: 'b', label: 'B', tab, widget })
		reg.unregister('a')
		expect(seen).toEqual([['a'], ['a', 'b'], ['b']])
		unsubscribe()
		reg.register({ id: 'c', label: 'C', tab, widget })
		expect(seen).toHaveLength(3)
	})

	it('isolates subscribers that throw', () => {
		const reg = createIntegrationRegistry()
		const good = jest.fn()
		reg.onChange(() => { throw new Error('boom') })
		reg.onChange(good)
		// Suppress the dev-mode console.error from the throwing subscriber.
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		reg.register({ id: 'a', label: 'A', tab, widget })
		expect(good).toHaveBeenCalledTimes(1)
		spy.mockRestore()
	})

	// --- renderMode / mount hand-off (openregister#2127, ADR-066) ------------

	it('defaults renderMode to "component" and leaves mount/unmount null', () => {
		const reg = createIntegrationRegistry()
		reg.register({ id: 'notes', label: 'Notes', tab, widget })
		const entry = reg.get('notes')
		expect(entry.renderMode).toBe('component')
		expect(entry.mount).toBe(null)
		expect(entry.unmount).toBe(null)
	})

	it('accepts a mount-mode descriptor with a mount/unmount pair and no tab/widget', () => {
		const reg = createIntegrationRegistry()
		const mount = jest.fn()
		const unmount = jest.fn()
		reg.register({ id: 'hermiq', label: 'Agent', renderMode: 'mount', mount, unmount })
		const entry = reg.get('hermiq')
		expect(entry.renderMode).toBe('mount')
		expect(entry.mount).toBe(mount)
		expect(entry.unmount).toBe(unmount)
		expect(entry.tab).toBe(null)
		expect(entry.widget).toBe(null)
	})

	it('rejects a half mount pair (mount without unmount) in dev', () => {
		const reg = createIntegrationRegistry()
		expect(() => reg.register({ id: 'x', label: 'X', renderMode: 'mount', mount: jest.fn() }))
			.toThrow(/mount pair must travel together/)
	})

	it('rejects a half mount pair (unmount without mount) in dev', () => {
		const reg = createIntegrationRegistry()
		expect(() => reg.register({ id: 'x', label: 'X', renderMode: 'mount', unmount: jest.fn() }))
			.toThrow(/mount pair must travel together/)
	})

	it('rejects a mount-mode descriptor with no mount pair at all', () => {
		const reg = createIntegrationRegistry()
		expect(() => reg.register({ id: 'x', label: 'X', renderMode: 'mount', tab, widget }))
			.toThrow(/missing the `mount`\/`unmount` pair/)
	})

	it('still requires tab/widget for a component-mode descriptor', () => {
		const reg = createIntegrationRegistry()
		expect(() => reg.register({ id: 'x', label: 'X', renderMode: 'component', widget }))
			.toThrow(/missing required `tab`/)
	})

	it('throws on an invalid renderMode value', () => {
		const reg = createIntegrationRegistry()
		expect(() => reg.register({ id: 'x', label: 'X', renderMode: 'iframe', tab, widget }))
			.toThrow(/invalid `renderMode`/)
	})

	it('allows an SFC pair AND a mount pair together (same-major fast path)', () => {
		const reg = createIntegrationRegistry()
		const mount = jest.fn()
		const unmount = jest.fn()
		reg.register({ id: 'both', label: 'Both', tab, widget, renderMode: 'mount', mount, unmount })
		const entry = reg.get('both')
		expect(entry.renderMode).toBe('mount')
		expect(entry.tab).toBe(tab)
		expect(entry.widget).toBe(widget)
		expect(entry.mount).toBe(mount)
	})

	it('get() and has() lookups work', () => {
		const reg = createIntegrationRegistry()
		expect(reg.get('x')).toBe(null)
		expect(reg.has('x')).toBe(false)
		reg.register({ id: 'x', label: 'X', tab, widget })
		expect(reg.has('x')).toBe(true)
		expect(reg.get('x').id).toBe('x')
	})

	it('unregister returns false when id was unknown', () => {
		const reg = createIntegrationRegistry()
		expect(reg.unregister('nope')).toBe(false)
	})
})

describe('installIntegrationRegistry', () => {
	let installIntegrationRegistry, integrations

	beforeEach(() => {
		jest.isolateModules(() => {
			const mod = require('../../src/integrations/registry.js')
			installIntegrationRegistry = mod.installIntegrationRegistry
			integrations = mod.integrations
		})
	})

	it('attaches the singleton to globalRef.OCA.OpenRegister.integrations', () => {
		const fakeWindow = {}
		const installed = installIntegrationRegistry(fakeWindow)
		expect(installed).toBe(integrations)
		expect(fakeWindow.OCA.OpenRegister.integrations).toBe(integrations)
	})

	it('drains queued registrations from a pre-existing stub', () => {
		const fakeWindow = {
			OCA: {
				OpenRegister: {
					integrations: {
						_queue: [
							{ id: 'pre1', label: 'Pre 1', tab, widget },
							{ id: 'pre2', label: 'Pre 2', tab, widget },
						],
					},
				},
			},
		}
		installIntegrationRegistry(fakeWindow)
		const ids = integrations.list().map((p) => p.id)
		expect(ids).toContain('pre1')
		expect(ids).toContain('pre2')
	})

	it('tolerates failed replays without breaking subsequent registrations', () => {
		const fakeWindow = {
			OCA: {
				OpenRegister: {
					integrations: {
						_queue: [
							{ id: '', label: 'broken', tab, widget }, // invalid id
							{ id: 'valid', label: 'Valid', tab, widget },
						],
					},
				},
			},
		}
		// Suppress the dev-mode console.error from the failed replay.
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		installIntegrationRegistry(fakeWindow)
		spy.mockRestore()
		expect(integrations.has('valid')).toBe(true)
	})
})

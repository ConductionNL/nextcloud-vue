/**
 * Tests for registerIntegration() — the load-order-safe leaf-side
 * registration helper (Path 2).
 *
 * Three load orders matter:
 *   1. OR installed its singleton first → registers live.
 *   2. Leaf runs first (no global) → installs a stub + queues; OR
 *      replays via installIntegrationRegistry later.
 *   3. Another leaf's stub already exists → appends to its queue.
 */

const tab = { name: 'StubTab' }
const widget = { name: 'StubWidget' }

describe('registerIntegration', () => {
	let registerIntegration, installIntegrationRegistry, integrations

	beforeEach(() => {
		jest.isolateModules(() => {
			const mod = require('../../src/integrations/registry.js')
			registerIntegration = mod.registerIntegration
			installIntegrationRegistry = mod.installIntegrationRegistry
			integrations = mod.integrations
		})
	})

	it('registers live when OR singleton is already installed', () => {
		const fakeWindow = {}
		installIntegrationRegistry(fakeWindow) // OR loads first
		registerIntegration({ id: 'sync-contract', label: 'Synced from', tab, widget }, fakeWindow)
		expect(integrations.has('sync-contract')).toBe(true)
		// And it's the real singleton, not a stub.
		expect(fakeWindow.OCA.OpenRegister.integrations._queue).toBeUndefined()
	})

	it('installs a stub and queues when OR has not loaded yet', () => {
		const fakeWindow = {}
		registerIntegration({ id: 'sync-contract', label: 'Synced from', tab, widget }, fakeWindow)
		// No real singleton yet — a stub with a queued descriptor exists.
		const stub = fakeWindow.OCA.OpenRegister.integrations
		expect(Array.isArray(stub._queue)).toBe(true)
		expect(stub._queue.map((d) => d.id)).toContain('sync-contract')
		// Not yet in the real registry.
		expect(integrations.has('sync-contract')).toBe(false)

		// OR loads later and replays.
		installIntegrationRegistry(fakeWindow)
		expect(integrations.has('sync-contract')).toBe(true)
	})

	it('appends to an existing leaf stub queue (multi-leaf, OR last)', () => {
		const fakeWindow = {}
		registerIntegration({ id: 'leaf-a', label: 'A', tab, widget }, fakeWindow)
		registerIntegration({ id: 'leaf-b', label: 'B', tab, widget }, fakeWindow)
		const queued = fakeWindow.OCA.OpenRegister.integrations._queue.map((d) => d.id)
		expect(queued).toEqual(['leaf-a', 'leaf-b'])

		installIntegrationRegistry(fakeWindow)
		expect(integrations.has('leaf-a')).toBe(true)
		expect(integrations.has('leaf-b')).toBe(true)
	})

	it('delegates validation on the live path (missing tab/widget throws)', () => {
		const fakeWindow = {}
		installIntegrationRegistry(fakeWindow)
		expect(() => registerIntegration({ id: 'broken', label: 'Broken' }, fakeWindow)).toThrow()
	})
})

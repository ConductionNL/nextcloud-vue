/**
 * Tests for the universal-shared-registry reconciliation:
 *   - installIntegrationRegistry converges (doesn't clobber) on a
 *     real registry installed by another bundle.
 *   - getSharedRegistry installs-if-needed + is idempotent.
 *   - sharedRegistryIfInstalled is read-only (no window mutation) and
 *     ignores a bare stub queue.
 *
 * The cross-bundle case is simulated by hand-building a "foreign"
 * real-registry object on the fake global (a different object than this
 * module's singleton), mirroring what another app's bundle would install.
 */

const tab = { name: 'StubTab' }
const widget = { name: 'StubWidget' }

describe('shared registry reconciliation', () => {
	let mod
	beforeEach(() => {
		jest.isolateModules(() => {
			mod = require('../../src/integrations/registry.js')
		})
	})

	it('sharedRegistryIfInstalled returns null when nothing is installed', () => {
		expect(mod.sharedRegistryIfInstalled({})).toBeNull()
	})

	it('sharedRegistryIfInstalled ignores a bare stub queue (not a real registry)', () => {
		const fakeWindow = {
			OCA: { OpenRegister: { integrations: { _queue: [], register() {} } } },
		}
		expect(mod.sharedRegistryIfInstalled(fakeWindow)).toBeNull()
	})

	it('sharedRegistryIfInstalled returns an installed real registry without mutating', () => {
		const fakeWindow = {}
		const installed = mod.installIntegrationRegistry(fakeWindow)
		const before = fakeWindow.OCA.OpenRegister.integrations
		const got = mod.sharedRegistryIfInstalled(fakeWindow)
		expect(got).toBe(installed)
		expect(fakeWindow.OCA.OpenRegister.integrations).toBe(before) // unchanged
	})

	it('installIntegrationRegistry CONVERGES on a foreign real registry (no clobber)', () => {
		// Simulate another bundle's already-installed real registry.
		const foreign = mod.createIntegrationRegistry()
		foreign.register({ id: 'from-other-bundle', label: 'Other', tab, widget })
		const fakeWindow = { OCA: { OpenRegister: { integrations: foreign } } }

		const result = mod.installIntegrationRegistry(fakeWindow)
		// Returns the foreign registry, did NOT replace it with our singleton.
		expect(result).toBe(foreign)
		expect(fakeWindow.OCA.OpenRegister.integrations).toBe(foreign)
		expect(mod.integrations.has('from-other-bundle')).toBe(false) // our singleton untouched
	})

	it('installIntegrationRegistry still drains a stub queue when no real registry exists', () => {
		const fakeWindow = {
			OCA: { OpenRegister: { integrations: { _queue: [{ id: 'queued', label: 'Q', tab, widget }] } } },
		}
		const result = mod.installIntegrationRegistry(fakeWindow)
		expect(result).toBe(mod.integrations)
		expect(mod.integrations.has('queued')).toBe(true)
	})

	it('getSharedRegistry installs the singleton when none present, then is idempotent', () => {
		const fakeWindow = {}
		const a = mod.getSharedRegistry(fakeWindow)
		const b = mod.getSharedRegistry(fakeWindow)
		expect(a).toBe(mod.integrations)
		expect(b).toBe(a)
		expect(fakeWindow.OCA.OpenRegister.integrations).toBe(a)
	})

	it('getSharedRegistry converges on a foreign registry rather than installing ours', () => {
		const foreign = mod.createIntegrationRegistry()
		const fakeWindow = { OCA: { OpenRegister: { integrations: foreign } } }
		expect(mod.getSharedRegistry(fakeWindow)).toBe(foreign)
	})
})

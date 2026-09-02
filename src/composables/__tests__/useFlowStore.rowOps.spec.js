/**
 * Tests for the flow store's row operations: remove and duplicate.
 *
 * These back the flows entity source's Delete and Copy row actions, so the
 * property that matters is SCOPE: an index page acts on a ROW while no flow is
 * open, and the reload after the operation must come back in the page's app
 * scope — not the open flow's (blank on an index page, which reloads EVERY
 * app's flows into a list that was scoped to one).
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

// 🔑 HELD, NOT REQUIRED BACK. `@nextcloud/axios` is a PEER dependency, so
// `require()`ing it here trips eslint's `n/no-missing-require` — the module is
// legitimately absent from this package's own tree. A `mock`-prefixed variable
// is the one thing a jest.mock factory may close over, so the spec keeps a
// handle on the double without ever importing the real module.
const mockAxios = {
	get: jest.fn(),
	post: jest.fn(),
	put: jest.fn(),
	delete: jest.fn(),
}

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: mockAxios,
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path) => path,
}))

const { setActivePinia, createPinia } = require('pinia')
const { useFlowStore } = require('../useFlowStore.js')

describe('useFlowStore — remove and duplicate', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		jest.clearAllMocks()
		// The list reload after either operation.
		mockAxios.get.mockResolvedValue({ data: { results: [] } })
		mockAxios.post.mockResolvedValue({ data: { id: 'copy-1', name: 'Copy' } })
		mockAxios.delete.mockResolvedValue({ data: {} })
	})

	it('remove deletes the flow and reloads in the caller-passed app scope', async () => {
		const store = useFlowStore()

		await store.remove('flow-1', { app: 'dossiq' })

		expect(mockAxios.delete).toHaveBeenCalledWith('/apps/openregister/api/flows/flow-1')
		const listCall = mockAxios.get.mock.calls.find(([url]) => url === '/apps/openregister/api/flows')
		expect(listCall[1]).toEqual({ params: { app: 'dossiq' } })
	})

	it('remove without a scope keeps the editor behaviour: the open flow\'s app', async () => {
		const store = useFlowStore()
		store.flow = { ...store.flow, app: 'openregister' }

		await store.remove('flow-1')

		const listCall = mockAxios.get.mock.calls.find(([url]) => url === '/apps/openregister/api/flows')
		expect(listCall[1]).toEqual({ params: { app: 'openregister' } })
	})

	it('duplicate reads the stored flow and re-posts it without identity or lifecycle', async () => {
		const store = useFlowStore()
		mockAxios.get.mockImplementation((url) => {
			if (url === '/apps/openregister/api/flows/flow-1') {
				return Promise.resolve({
					data: {
						id: 'flow-1',
						uuid: 'uuid-1',
						owner: 'alice',
						organisation: 'org-1',
						created: '2026-01-01',
						updated: '2026-02-01',
						lifecycleStatus: 'published',
						version: 3,
						name: 'Intake',
						description: 'Routes intakes',
						app: 'dossiq',
						nodes: [{ id: 'n1' }],
						edges: [],
						enabled: true,
					},
				})
			}
			return Promise.resolve({ data: { results: [] } })
		})

		const created = await store.duplicate('flow-1', 'Intake (copy)', { app: 'dossiq' })

		expect(mockAxios.post).toHaveBeenCalledTimes(1)
		const [url, payload] = mockAxios.post.mock.calls[0]
		expect(url).toBe('/apps/openregister/api/flows')
		expect(payload.name).toBe('Intake (copy)')
		// The graph and scope travel with the copy...
		expect(payload.nodes).toEqual([{ id: 'n1' }])
		expect(payload.app).toBe('dossiq')
		// ...identity and lifecycle do not: a copy is a NEW flow. The server's
		// allowlist would refuse these anyway; stripping them documents it.
		for (const key of ['id', 'uuid', 'owner', 'organisation', 'created', 'updated', 'lifecycleStatus', 'version']) {
			expect(payload).not.toHaveProperty(key)
		}
		// And the list comes back in the page's scope.
		const listCall = mockAxios.get.mock.calls.find(([u]) => u === '/apps/openregister/api/flows')
		expect(listCall[1]).toEqual({ params: { app: 'dossiq' } })
		expect(created).toEqual({ id: 'copy-1', name: 'Copy' })
	})

	it('duplicate lets a failed create reject rather than reporting a copy that never happened', async () => {
		const store = useFlowStore()
		mockAxios.get.mockResolvedValue({ data: { id: 'flow-1', name: 'Intake' } })
		mockAxios.post.mockRejectedValue(new Error('A flow needs a name.'))

		await expect(store.duplicate('flow-1', '', {})).rejects.toThrow('A flow needs a name.')
	})
})

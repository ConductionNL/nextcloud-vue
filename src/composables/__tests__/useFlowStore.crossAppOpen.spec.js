/**
 * Tests for opening a flow the app-scoped list does not contain.
 *
 * The defect these pin: `open()` resolved a flow by searching `this.flows`, a
 * list fetched scoped to ONE app. A flow belonging to a different app was
 * therefore absent, the lookup missed, and `open()` returned silently — leaving
 * the canvas blank with no error. Measured on a dossiq case whose eighteen flow
 * runs all belong to a flow owned by `openregister`: every run row opened an
 * empty editor.
 *
 * A blank canvas is also exactly what a brand-new flow looks like, which is why
 * "silently returns" was so hard to see.
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

const LIST_URL = '/apps/openregister/api/flows'
const CROSS_APP_ID = 'cccf6203-ffbc-4406-b45e-6c99b914813c'

describe('useFlowStore — opening a flow from another app', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		jest.clearAllMocks()
		mockAxios.get.mockResolvedValue({ data: { results: [] } })
	})

	it('resolves a flow the app-scoped list did not return', async () => {
		// The exact shape that broke: the page loads `?app=dossiq`, and the flow
		// the route names is owned by `openregister`, so the list comes back
		// without it.
		mockAxios.get.mockImplementation((url) => {
			if (url === LIST_URL) {
				return Promise.resolve({ data: { results: [{ id: 'dossiq-flow', name: 'A dossiq flow', app: 'dossiq' }] } })
			}
			if (url === `${LIST_URL}/${CROSS_APP_ID}`) {
				return Promise.resolve({ data: { id: CROSS_APP_ID, name: 'Run lock demo', app: 'openregister', nodes: [], edges: [] } })
			}
			return Promise.resolve({ data: { results: [] } })
		})

		const store = useFlowStore()
		await store.load({ app: 'dossiq', id: CROSS_APP_ID })

		expect(mockAxios.get).toHaveBeenCalledWith(`${LIST_URL}/${CROSS_APP_ID}`)
		expect(store.flow.id).toBe(CROSS_APP_ID)
		expect(store.flow.name).toBe('Run lock demo')
		expect(store.notFound).toBeNull()
	})

	it('does not spend a request when the list already carried the flow', async () => {
		mockAxios.get.mockImplementation((url) => {
			if (url === LIST_URL) {
				return Promise.resolve({ data: { results: [{ id: 'flow-1', name: 'In the list', app: 'dossiq', nodes: [], edges: [] }] } })
			}
			return Promise.resolve({ data: { results: [] } })
		})

		const store = useFlowStore()
		await store.load({ app: 'dossiq', id: 'flow-1' })

		expect(mockAxios.get).not.toHaveBeenCalledWith(`${LIST_URL}/flow-1`)
		expect(store.flow.name).toBe('In the list')
	})

	it('reports a flow that resolves nowhere instead of rendering a blank canvas', async () => {
		mockAxios.get.mockImplementation((url) => {
			if (url === LIST_URL) {
				return Promise.resolve({ data: { results: [] } })
			}
			return Promise.reject(new Error('Request failed with status code 404'))
		})

		const store = useFlowStore()
		await store.load({ app: 'dossiq', id: 'gone-flow' })

		expect(store.notFound).toBe('gone-flow')
	})

	it('clears a stale not-found when the next flow does resolve', async () => {
		mockAxios.get.mockImplementation((url) => {
			if (url === LIST_URL) {
				return Promise.resolve({ data: { results: [{ id: 'flow-1', name: 'Real', app: 'dossiq', nodes: [], edges: [] }] } })
			}
			return Promise.reject(new Error('404'))
		})

		const store = useFlowStore()
		await store.load({ app: 'dossiq', id: 'gone-flow' })
		expect(store.notFound).toBe('gone-flow')

		await store.load({ app: 'dossiq', id: 'flow-1' })
		expect(store.notFound).toBeNull()
		expect(store.flow.name).toBe('Real')
	})

	it('a new flow is never reported as not found', async () => {
		const store = useFlowStore()
		await store.load({ app: 'dossiq', id: 'new' })

		expect(store.notFound).toBeNull()
		expect(mockAxios.get).not.toHaveBeenCalledWith(`${LIST_URL}/new`)
	})
})

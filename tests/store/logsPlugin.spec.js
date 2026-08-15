import { createPinia, setActivePinia } from 'pinia'
import { createCrudStore } from '../../src/store/createCrudStore.js'
import { logsPlugin } from '../../src/store/plugins/logs.js'

function okJson(data) {
	return {
		ok: true,
		json: () => Promise.resolve(data),
	}
}

function errJson(status, body) {
	return {
		ok: false,
		status,
		statusText: 'Error',
		json: () => Promise.resolve(body),
	}
}

describe('logsPlugin', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		jest.clearAllMocks()
	})

	describe('factory validation', () => {
		it('throws if parentIdParam is missing', () => {
			expect(() => logsPlugin({})).toThrow('parentIdParam is required')
		})
	})

	describe('initial state', () => {
		it('contributes logs/logsLoading/logsError state and getters', () => {
			const useStore = createCrudStore('src-state', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			expect(store.logs).toEqual([])
			expect(store.logsLoading).toBe(false)
			expect(store.logsError).toBeNull()
			expect(store.getLogs).toEqual([])
			expect(store.isLogsLoading).toBe(false)
			expect(store.getLogsError).toBeNull()
		})
	})

	describe('refreshLogs', () => {
		it('hits baseApiUrl + /logs with parent id and default sort', async () => {
			const useStore = createCrudStore('src-url', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			store.item = { id: 42 }

			global.fetch = jest.fn().mockResolvedValue(okJson({ results: [{ id: 1 }] }))

			await store.refreshLogs()

			const url = global.fetch.mock.calls[0][0]
			expect(url).toContain('/sources/logs?')
			expect(url).toContain('source_id=42')
			// _sort[created]=desc — URLSearchParams percent-encodes the brackets
			expect(decodeURIComponent(url)).toContain('_sort[created]=desc')
		})

		it('stores the response data on this.logs', async () => {
			const useStore = createCrudStore('src-data', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			store.item = { id: 1 }
			global.fetch = jest.fn().mockResolvedValue(okJson({ results: [{ id: 'a' }, { id: 'b' }] }))

			const out = await store.refreshLogs()

			expect(out.data).toEqual({ results: [{ id: 'a' }, { id: 'b' }] })
			expect(store.logs).toEqual({ results: [{ id: 'a' }, { id: 'b' }] })
		})

		it('toggles logsLoading around the fetch', async () => {
			const useStore = createCrudStore('src-loading', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			store.item = { id: 1 }
			let inFlight = false
			global.fetch = jest.fn().mockImplementation(() => {
				inFlight = store.logsLoading
				return Promise.resolve(okJson({ results: [] }))
			})

			await store.refreshLogs()

			expect(inFlight).toBe(true)
			expect(store.logsLoading).toBe(false)
		})

		it('caller filters override the auto-injected parent id', async () => {
			const useStore = createCrudStore('src-filters', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			store.item = { id: 1 }
			global.fetch = jest.fn().mockResolvedValue(okJson({ results: [] }))

			await store.refreshLogs({ source_id: 999, level: 'error' })

			const url = global.fetch.mock.calls[0][0]
			expect(url).toContain('source_id=999')
			expect(url).not.toContain('source_id=1')
			expect(url).toContain('level=error')
		})

		it('respects a custom path option', async () => {
			const useStore = createCrudStore('src-path', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id', path: 'audit' })],
			})
			const store = useStore()
			store.item = { id: 1 }
			global.fetch = jest.fn().mockResolvedValue(okJson({ results: [] }))

			await store.refreshLogs()

			expect(global.fetch.mock.calls[0][0]).toContain('/sources/audit?')
		})

		it('respects a custom defaultSort option', async () => {
			const useStore = createCrudStore('src-sort', {
				endpoint: 'sources',
				plugins: [logsPlugin({
					parentIdParam: 'source_id',
					defaultSort: { '_sort[timestamp]': 'asc' },
				})],
			})
			const store = useStore()
			store.item = { id: 1 }
			global.fetch = jest.fn().mockResolvedValue(okJson({ results: [] }))

			await store.refreshLogs()

			const url = decodeURIComponent(global.fetch.mock.calls[0][0])
			expect(url).toContain('_sort[timestamp]=asc')
			expect(url).not.toContain('_sort[created]')
		})

		it('omits parent id when no item is active', async () => {
			const useStore = createCrudStore('src-noitem', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			global.fetch = jest.fn().mockResolvedValue(okJson({ results: [] }))

			await store.refreshLogs()

			expect(global.fetch.mock.calls[0][0]).not.toContain('source_id=')
		})

		it('records logsError on non-ok response without throwing', async () => {
			const useStore = createCrudStore('src-err', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			store.item = { id: 1 }
			global.fetch = jest.fn().mockResolvedValue(errJson(500, { message: 'boom' }))

			const out = await store.refreshLogs()

			expect(out.data).toBeNull()
			expect(store.logsError).toBeTruthy()
			expect(store.logsLoading).toBe(false)
		})

		it('records a networkError and rethrows on fetch rejection', async () => {
			const useStore = createCrudStore('src-neterr', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			store.item = { id: 1 }
			const err = new TypeError('offline')
			global.fetch = jest.fn().mockRejectedValue(err)

			await expect(store.refreshLogs()).rejects.toBe(err)
			expect(store.logsError).toBeTruthy()
			expect(store.logsLoading).toBe(false)
		})
	})

	describe('setLogs / clearLogs', () => {
		it('setLogs replaces state', () => {
			const useStore = createCrudStore('src-setlogs', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			store.setLogs([{ id: 1 }])
			expect(store.logs).toEqual([{ id: 1 }])
		})

		it('clearLogs resets state', () => {
			const useStore = createCrudStore('src-clear', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			store.logs = [{ id: 1 }]
			store.logsLoading = true
			store.logsError = { message: 'x' }

			store.clearLogs()

			expect(store.logs).toEqual([])
			expect(store.logsLoading).toBe(false)
			expect(store.logsError).toBeNull()
		})
	})

	describe('autoRefreshOnItemChange', () => {
		class Src {

			constructor(data) { Object.assign(this, data) }

		}

		it('auto-fires refreshLogs when setItem receives an item with id', async () => {
			const useStore = createCrudStore('src-auto', {
				endpoint: 'sources',
				entity: Src,
				plugins: [logsPlugin({ parentIdParam: 'source_id', autoRefreshOnItemChange: true })],
			})
			const store = useStore()
			global.fetch = jest.fn().mockResolvedValue(okJson({ results: [] }))

			store.setItem({ id: 7 })
			// Wait for the fire-and-forget fetch
			await new Promise((r) => setTimeout(r, 0))

			expect(store.item).toBeInstanceOf(Src)
			expect(store.item.id).toBe(7)
			expect(global.fetch).toHaveBeenCalledTimes(1)
			expect(global.fetch.mock.calls[0][0]).toContain('source_id=7')
		})

		it('clears logs when setItem receives null', async () => {
			const useStore = createCrudStore('src-auto-clear', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id', autoRefreshOnItemChange: true })],
			})
			const store = useStore()
			store.logs = [{ id: 1 }]
			global.fetch = jest.fn()

			store.setItem(null)

			expect(store.item).toBeNull()
			expect(store.logs).toEqual([])
			expect(global.fetch).not.toHaveBeenCalled()
		})

		it('off by default — setItem does not auto-refresh', () => {
			const useStore = createCrudStore('src-noauto', {
				endpoint: 'sources',
				plugins: [logsPlugin({ parentIdParam: 'source_id' })],
			})
			const store = useStore()
			global.fetch = jest.fn()

			store.setItem({ id: 9 })

			expect(global.fetch).not.toHaveBeenCalled()
		})
	})
})

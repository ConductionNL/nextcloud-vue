/**
 * Tests for CnDetailPage's auto-subscribe store resolution
 * (manifest-live-updates).
 *
 * The auto-subscribe machinery (useObjectSubscription in setup()) used to
 * engage ONLY when an explicit `objectStore` prop was passed — which the
 * manifest renderer never does, so manifest detail pages never subscribed.
 * In schema-driven mode (`register` + `schema`, no explicit store) the page
 * now falls back to the library's default `useObjectStore()`:
 *
 *   - schema-driven mount → registers the fused type + subscribes to the
 *     object, unsubscribes on unmount
 *   - `subscribe: false` opts out
 *   - legacy `objectType`-only mounts without a store keep today's
 *     behaviour (no subscription)
 *   - an explicit `objectStore` prop still wins over the fallback
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockDefaultStore = {
	objects: {},
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(function(slug) {
		mockDefaultStore.objectTypeRegistry = { ...mockDefaultStore.objectTypeRegistry, [slug]: {} }
	}),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
	subscribe: jest.fn().mockResolvedValue({ _livePlugin: true, eventKey: 'or-object-a-1' }),
	unsubscribe: jest.fn(),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockDefaultStore,
	createObjectStore: () => () => mockDefaultStore,
}))

const { mount } = require('@vue/test-utils')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
	jest.clearAllMocks()
	mockDefaultStore.objects = {}
	mockDefaultStore.schemas = {}
	mockDefaultStore.objectTypeRegistry = {}
	mockDefaultStore.subscribe.mockResolvedValue({ _livePlugin: true, eventKey: 'or-object-a-1' })
})

describe('CnDetailPage — auto-subscribe store resolution', () => {
	it('schema-driven mode (no objectStore prop) resolves the default store and subscribes', async () => {
		const w = mount(CnDetailPage, {
			propsData: { register: 'openbuilt', schema: 'application', objectId: 'a-1' },
		})
		await flush()

		// The fused type was registered exactly once (setup registers it;
		// the mounted() fetch path sees it registered and skips its own).
		const regCalls = mockDefaultStore.registerObjectType.mock.calls
			.filter(([slug]) => slug === 'openbuilt-application')
		expect(regCalls).toHaveLength(1)
		expect(regCalls[0]).toEqual([
			'openbuilt-application',
			'application',
			'openbuilt',
			{ registerSlug: 'openbuilt', schemaSlug: 'application' },
		])

		// Auto-subscribe engaged against the default store.
		expect(mockDefaultStore.subscribe).toHaveBeenCalledWith('openbuilt-application', 'a-1')

		w.destroy()
		await flush()
		expect(mockDefaultStore.unsubscribe).toHaveBeenCalledTimes(1)
	})

	it('subscribe:false (manifest config.subscribe) opts out', async () => {
		const w = mount(CnDetailPage, {
			propsData: { register: 'openbuilt', schema: 'application', objectId: 'a-1', subscribe: false },
		})
		await flush()
		expect(mockDefaultStore.subscribe).not.toHaveBeenCalled()
		// The schema-driven fetch still runs — only the subscription is skipped.
		expect(mockDefaultStore.fetchObject).toHaveBeenCalledWith('openbuilt-application', 'a-1')
		w.destroy()
	})

	it('legacy objectType-only mount without a store does not subscribe', async () => {
		const w = mount(CnDetailPage, {
			propsData: { objectType: 'legacy-slug', objectId: 'a-1' },
		})
		await flush()
		expect(mockDefaultStore.subscribe).not.toHaveBeenCalled()
		w.destroy()
	})

	it('an explicit objectStore prop wins over the schema-driven fallback', async () => {
		const explicitStore = {
			objects: {},
			schemas: {},
			objectTypeRegistry: { 'openbuilt-application': {} },
			registerObjectType: jest.fn(),
			fetchObject: jest.fn(async () => null),
			fetchSchema: jest.fn(async () => null),
			subscribe: jest.fn().mockResolvedValue({ _livePlugin: true }),
			unsubscribe: jest.fn(),
		}
		const w = mount(CnDetailPage, {
			propsData: {
				register: 'openbuilt',
				schema: 'application',
				objectId: 'a-1',
				objectStore: explicitStore,
			},
		})
		await flush()
		expect(explicitStore.subscribe).toHaveBeenCalledWith('openbuilt-application', 'a-1')
		expect(mockDefaultStore.subscribe).not.toHaveBeenCalled()
		w.destroy()
	})
})

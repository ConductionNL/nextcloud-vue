/**
 * Integration test for the renderer→detail live-updates gap
 * (manifest-live-updates).
 *
 * CnPageRenderer never passes an `objectStore` prop to the dispatched
 * CnDetailPage — it forwards `register` + `schema` from `pages[].config`
 * and maps the `:id` route param to `objectId`. CnDetailPage's
 * schema-driven store fallback must therefore engage the auto-subscribe
 * machinery from exactly this prop shape, with `config.subscribe: false`
 * flowing through the renderer as the opt-out.
 *
 * The `pageTypes` prop is overridden with the REAL (non-async)
 * CnDetailPage so the full renderer → page dispatch → setup() chain runs
 * synchronously in one mount.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockStore = {
	objects: {},
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(function(slug) {
		mockStore.objectTypeRegistry = { ...mockStore.objectTypeRegistry, [slug]: {} }
	}),
	fetchObject: jest.fn(async () => ({ id: 'pub-1', title: 'Hello' })),
	fetchSchema: jest.fn(async () => ({ properties: {} })),
	getObject: jest.fn(() => null),
	getSchema: jest.fn(() => null),
	subscribe: jest.fn().mockResolvedValue({ _livePlugin: true, eventKey: 'or-object-pub-1' }),
	unsubscribe: jest.fn(),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Build a single-detail-page manifest.
 *
 * @param {object} [configExtra] Extra keys merged into the page config.
 * @return {object} The manifest object.
 */
function makeManifest(configExtra = {}) {
	return {
		pages: [
			{
				id: 'publication-detail',
				route: '/publications/:id',
				type: 'detail',
				title: 'Publication',
				config: { register: 'publication', schema: 'publication', ...configExtra },
			},
		],
	}
}

/**
 * Mount CnPageRenderer on the detail route with the real CnDetailPage.
 *
 * @param {object} manifest The manifest to render.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountRenderer(manifest) {
	return mount(CnPageRenderer, {
		propsData: {
			manifest,
			pageTypes: { detail: CnDetailPage },
		},
		mocks: {
			$route: { name: 'publication-detail', params: { id: 'pub-1' } },
			$router: { push: jest.fn() },
		},
	})
}

beforeEach(() => {
	jest.clearAllMocks()
	mockStore.objects = {}
	mockStore.schemas = {}
	mockStore.objectTypeRegistry = {}
	mockStore.subscribe.mockResolvedValue({ _livePlugin: true, eventKey: 'or-object-pub-1' })
})

describe('CnPageRenderer → CnDetailPage live updates', () => {
	it('a manifest detail page auto-subscribes to its object with zero app-side wiring', async () => {
		const w = mountRenderer(makeManifest())
		await flush()

		// The renderer forwarded register/schema/objectId (and aliased
		// config.schema → objectType) — the page's schema-driven fallback
		// subscribed to the effective type slug + route id, the SAME slug
		// its fetch path uses (`resolvedObjectType`), so the event-driven
		// refetch lands in the cache key the page renders from.
		expect(mockStore.subscribe).toHaveBeenCalledWith('publication', 'pub-1')

		// And the effective type was registered before the subscription
		// could resolve (guards the "type not registered" race).
		expect(mockStore.objectTypeRegistry.publication).toBeTruthy()

		w.destroy()
		await flush()
		expect(mockStore.unsubscribe).toHaveBeenCalled()
	})

	it('config.subscribe: false flows through the renderer as the opt-out', async () => {
		const w = mountRenderer(makeManifest({ subscribe: false }))
		await flush()
		expect(mockStore.subscribe).not.toHaveBeenCalled()
		w.destroy()
	})
})

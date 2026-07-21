/**
 * Tests for the v2 widget-grid LIVE detail context (#222).
 *
 * On a v2-manifest `type:"detail"` page rendered through CnWidgetGrid,
 * CnPageRenderer.loadDetailObject publishes the object into the
 * `cnDetailObjectContext` holder. Before #222 that holder froze a
 * SNAPSHOT: no `or-object-{id}` subscription existed on this path, and
 * even when the live-updates plugin refetched into the store cache the
 * holder's copy never updated.
 *
 * Now the renderer (a) subscribes to the loaded object — same guards
 * and `config.subscribe: false` opt-out as the CnIndexPage /
 * CnDetailPage paths — and (b) publishes `objectData` / `schema` as
 * READ-THROUGH getters over the store cache, so widgets re-render when
 * the plugin's refetch lands. These tests drive a real mount with a
 * reactive mock cache and assert the DOM updates.
 */

const { reactive, nextTick } = require('vue')

// Reactive cache backing the mock store — mirrors the real store's
// `objects` / `schemas` state so the holder's read-through getters
// track it. (`mock`-prefixed so jest.mock()'s hoisted factory may
// reference the store built on top of it.)
const mockState = reactive({ objects: {}, schemas: {} })

const mockStore = {
	objectTypeRegistry: {},
	registerObjectType: jest.fn((slug) => {
		mockStore.objectTypeRegistry = { ...mockStore.objectTypeRegistry, [slug]: {} }
	}),
	getObject: (type, id) => mockState.objects[type]?.[id] || null,
	getSchema: (type) => mockState.schemas[type] || null,
	fetchObject: jest.fn(async (type, id) => {
		const data = { id, title: 'Hello', '@self': { id } }
		mockState.objects = { ...mockState.objects, [type]: { ...(mockState.objects[type] || {}), [id]: data } }
		return data
	}),
	fetchSchema: jest.fn(async (type) => {
		const schema = { properties: { title: { type: 'string' } } }
		mockState.schemas = { ...mockState.schemas, [type]: schema }
		return schema
	}),
	subscribe: jest.fn(async (type, id) => ({ _livePlugin: true, type, id })),
	unsubscribe: jest.fn(),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Minimal widget rendering the holder-fed objectData — no self-fetch.
 * Render function (not a template string): jest runs the runtime-only
 * Vue build.
 */
const LiveStub = {
	name: 'LiveStub',
	props: {
		objectData: { type: Object, default: null },
		objectId: { type: String, default: '' },
	},
	render(h) {
		return h('div', { class: 'live-stub' }, this.objectData ? this.objectData.title : 'none')
	},
}

/**
 * Build a v2 manifest with a widget-grid detail page and a dashboard.
 *
 * @param {object} [configExtra] Extra keys merged into the detail page config.
 * @return {object} The manifest object.
 */
function makeManifest(configExtra = {}) {
	return {
		$schema: 'https://example/app-manifest-v2.schema.json',
		pages: [
			{
				id: 'publication-detail',
				route: '/publications/:id',
				type: 'detail',
				title: 'Publication',
				config: { register: 'publication', schema: 'publication', ...configExtra },
				widgets: [{ widgetKey: 'live-stub', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
			},
			{
				id: 'dashboard',
				route: '/',
				type: 'dashboard',
				title: 'Dashboard',
				config: {},
			},
		],
	}
}

/**
 * Mount CnPageRenderer on the detail route with a reactive route mock.
 *
 * @param {object} manifest The manifest to render.
 * @param {object} [route] Reactive `$route` mock (defaults to the detail page).
 * @return {object} The Vue Test Utils wrapper.
 */
function mountRenderer(manifest, route) {
	return mount(CnPageRenderer, {
		propsData: { manifest },
		provide: {
			cnRegistry: { 'live-stub': { kind: 'widget', component: LiveStub } },
			cnTranslate: (k) => k,
		},
		mocks: {
			$route: route || reactive({ name: 'publication-detail', params: { id: 'pub-1' } }),
			$router: { push: jest.fn() },
		},
	})
}

beforeEach(() => {
	jest.clearAllMocks()
	mockState.objects = {}
	mockState.schemas = {}
	mockStore.objectTypeRegistry = {}
})

describe('CnPageRenderer — v2 widget-grid live detail context (#222)', () => {
	it('subscribes to the loaded object on the widget-grid path (after registering the type)', async () => {
		const w = mountRenderer(makeManifest())
		await flush()

		expect(mockStore.subscribe).toHaveBeenCalledWith('publication-publication', 'pub-1')
		// Registration precedes subscribe — the plugin rejects unregistered types.
		expect(mockStore.objectTypeRegistry['publication-publication']).toBeTruthy()

		w.destroy()
	})

	it('widgets re-render through the holder when the store cache updates (plugin refetch)', async () => {
		const w = mountRenderer(makeManifest())
		await flush()
		expect(w.find('.live-stub').text()).toBe('Hello')

		// Simulate the live-updates plugin's event-driven refetch landing:
		// the cache entry is REPLACED, exactly like _requestObject does.
		mockState.objects = {
			...mockState.objects,
			'publication-publication': { 'pub-1': { id: 'pub-1', title: 'Updated live', '@self': { id: 'pub-1' } } },
		}
		await nextTick()

		expect(w.find('.live-stub').text()).toBe('Updated live')
		// The holder itself reads through too — no stale snapshot.
		expect(w.vm.detailObjectContext.value.objectData.title).toBe('Updated live')

		w.destroy()
	})

	it('re-scopes the subscription when the route object changes', async () => {
		const route = reactive({ name: 'publication-detail', params: { id: 'pub-1' } })
		const w = mountRenderer(makeManifest(), route)
		await flush()
		expect(mockStore.subscribe).toHaveBeenCalledWith('publication-publication', 'pub-1')

		route.params = { id: 'pub-2' }
		await flush()

		// Old handle released, new object subscribed.
		expect(mockStore.unsubscribe).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'pub-1' }),
		)
		expect(mockStore.subscribe).toHaveBeenCalledWith('publication-publication', 'pub-2')

		w.destroy()
	})

	it('releases the subscription on unmount', async () => {
		const w = mountRenderer(makeManifest())
		await flush()
		expect(mockStore.subscribe).toHaveBeenCalled()

		w.destroy()
		await flush()
		expect(mockStore.unsubscribe).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'pub-1' }),
		)
	})

	it('releases the subscription when the persistent renderer navigates off the detail page', async () => {
		const route = reactive({ name: 'publication-detail', params: { id: 'pub-1' } })
		const w = mountRenderer(makeManifest(), route)
		await flush()
		expect(mockStore.subscribe).toHaveBeenCalled()

		// Same renderer instance, non-detail page: the holder clears and
		// the subscription must be released (not leaked until unmount).
		route.name = 'dashboard'
		route.params = {}
		await flush()

		expect(mockStore.unsubscribe).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'pub-1' }),
		)
		expect(w.vm.detailObjectContext.value).toBeNull()

		w.destroy()
	})

	it('config.subscribe: false disables the widget-grid subscription (holder still loads)', async () => {
		const w = mountRenderer(makeManifest({ subscribe: false }))
		await flush()

		expect(mockStore.subscribe).not.toHaveBeenCalled()
		// The object still loads and renders — only the live wiring is off.
		expect(w.find('.live-stub').text()).toBe('Hello')

		w.destroy()
	})

	it('a consumer writing to the holder cannot clobber the live view or the store cache', async () => {
		const w = mountRenderer(makeManifest())
		await flush()

		const ctx = w.vm.detailObjectContext.value
		// Vue's observer preserves the read-through accessor; a top-level
		// write is a silent no-op (accessor without setter), so a consumer
		// cannot detach the holder from the cache or leak a mutation in.
		ctx.objectData = { title: 'HACKED' }
		ctx.schema = null
		await nextTick()

		expect(ctx.objectData.title).toBe('Hello')
		expect(ctx.schema).toEqual({ properties: { title: { type: 'string' } } })
		expect(mockState.objects['publication-publication']['pub-1'].title).toBe('Hello')

		w.destroy()
	})
})

/**
 * Tests for CnPageRenderer's object loading on `type:"detail"` pages.
 *
 * A v2 manifest detail page places body/sidebar widgets (`data`,
 * `metadata`, `file-manager`, …) that need the loaded object. Those
 * widgets display passed-in `objectData` / `schema` — they do not
 * self-fetch. CnPageRenderer therefore loads the object for the detail
 * page (from `config.register` / `config.schema` + the resolved
 * `config.idParam` / `:id` route param) and publishes it on the
 * `cnDetailObjectContext` reactive holder for descendant CnWidgetGrid
 * instances to merge into each widget's props.
 *
 * Regression guard: before this, the manifest detail page rendered an
 * empty widget grid because nothing loaded the object.
 */

const mockObject = { id: 'pub-1', title: 'Hello', '@self': { id: 'pub-1' } }
const mockSchema = { properties: { title: { type: 'string' } } }

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
// Cache-backed like the real store: fetches populate `objects` /
// `schemas`, the getters read them — the holder published by
// CnPageRenderer is a READ-THROUGH view over this cache (#222).
const mockStore = {
	objects: {},
	schemas: {},
	registerObjectType: jest.fn(),
	fetchObject: jest.fn((type, id) => {
		mockStore.objects = { ...mockStore.objects, [type]: { ...(mockStore.objects[type] || {}), [id]: mockObject } }
		return Promise.resolve(mockObject)
	}),
	fetchSchema: jest.fn((type) => {
		mockStore.schemas = { ...mockStore.schemas, [type]: mockSchema }
		return Promise.resolve(mockSchema)
	}),
	getObject: jest.fn((type, id) => mockStore.objects[type]?.[id] || null),
	getSchema: jest.fn((type) => mockStore.schemas[type] || null),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { shallowMount } = require('@vue/test-utils')
const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default

// Flush pending microtasks/timers so the async loadDetailObject resolves.
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const DETAIL_MANIFEST = {
	$schema: 'https://example/app-manifest-v2.schema.json',
	pages: [
		{
			id: 'PublicationDetail',
			route: '/publications/:catalogSlug/:id',
			type: 'detail',
			title: 'Publication',
			config: { register: 'publication', schema: 'publication', idParam: '@route.id' },
			widgets: [{ widgetKey: 'data', slot: 'body', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 4 }],
		},
		{
			id: 'Dashboard',
			route: '/',
			type: 'dashboard',
			title: 'Dashboard',
			config: {},
		},
	],
}

function mountRenderer(pageId, params) {
	return shallowMount(CnPageRenderer, {
		provide: {
			cnManifest: DETAIL_MANIFEST,
			cnCustomComponents: {},
			cnTranslate: (k) => k,
		},
		mocks: { $route: { name: pageId, params } },
	})
}

describe('CnPageRenderer — detail-page object loading', () => {
	beforeEach(() => {
		mockStore.objects = {}
		mockStore.schemas = {}
		mockStore.registerObjectType.mockClear()
		mockStore.fetchObject.mockClear()
		mockStore.fetchSchema.mockClear()
	})

	it('resolves detailLoadContext from config + @route.id', () => {
		const wrapper = mountRenderer('PublicationDetail', { catalogSlug: 'publications', id: 'pub-1' })
		expect(wrapper.vm.detailLoadContext).toEqual({
			register: 'publication',
			schema: 'publication',
			objectId: 'pub-1',
			slug: 'publication-publication',
		})
	})

	it('registers the {register}-{schema} type and fetches object + schema', async () => {
		mountRenderer('PublicationDetail', { catalogSlug: 'publications', id: 'pub-1' })
		await flushPromises()
		expect(mockStore.registerObjectType).toHaveBeenCalledWith('publication-publication', 'publication', 'publication')
		expect(mockStore.fetchSchema).toHaveBeenCalledWith('publication-publication')
		expect(mockStore.fetchObject).toHaveBeenCalledWith('publication-publication', 'pub-1')
	})

	it('publishes the loaded object + schema on the context holder', async () => {
		const wrapper = mountRenderer('PublicationDetail', { catalogSlug: 'publications', id: 'pub-1' })
		await flushPromises()
		expect(wrapper.vm.detailObjectContext.value).toMatchObject({
			objectData: mockObject,
			schema: mockSchema,
			objectType: 'publication-publication',
			objectId: 'pub-1',
			register: 'publication',
		})
	})

	it('does not load (and clears context) for a non-detail page', async () => {
		const wrapper = mountRenderer('Dashboard', {})
		await flushPromises()
		expect(wrapper.vm.detailLoadContext).toBeNull()
		expect(wrapper.vm.detailObjectContext.value).toBeNull()
		expect(mockStore.fetchObject).not.toHaveBeenCalled()
	})
})

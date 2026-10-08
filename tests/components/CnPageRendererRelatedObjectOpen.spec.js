/**
 * Tests for CnPageRenderer.onRelatedObjectOpen — a click on an object in a
 * detail page's Related widget opens that object's own detail page. The
 * object's `@self` names its register and schema by id; the manifest may
 * name them by slug, so the renderer describes both through the
 * OpenRegister API (once, cached) before it gives up.
 */
import { shallowMount } from '@vue/test-utils'

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path, params = {}) => Object.entries(params).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), path),
}))

const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default

const manifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	pages: [
		{ id: 'Modules', route: '/modules', type: 'index', title: 'Applications', config: { register: '20', schema: 'module' } },
		{ id: 'ModuleDetail', route: '/modules/:id', type: 'detail', title: 'Application', config: { register: '20', schema: 'module' } },
		{ id: 'OrganisatieDetail', route: '/organisaties/:objectId', type: 'detail', title: 'Organisation', config: { register: '20', schema: 'organization' } },
	],
}

const stub = { name: 'StubPage', render: (h) => h('div') }
const pageTypes = { index: stub, detail: stub }

function mountAt(pageId, m = manifest) {
	const push = jest.fn(() => Promise.resolve())
	const wrapper = shallowMount(CnPageRenderer, {
		propsData: { manifest: m, pageTypes },
		mocks: { $route: { name: pageId, params: { id: 'app-1' } }, $router: { push } },
	})
	return { wrapper, push }
}

/** Let every pending promise, including the dynamic imports, settle. */
async function settle() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve))
	}
}

beforeEach(() => {
	mockGet.mockReset()
	jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	console.warn.mockRestore()
})

describe('CnPageRenderer.onRelatedObjectOpen', () => {
	it('opens the detail page bound to the object register and schema, under that route own param name', async () => {
		const { wrapper, push } = mountAt('ModuleDetail')
		await wrapper.vm.onRelatedObjectOpen({ '@self': { id: 'org-9', register: '20', schema: 'organization' }, name: 'Vendor' })
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'OrganisatieDetail', params: expect.objectContaining({ objectId: 'org-9' }) }))
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('describes a register and schema named by id when the manifest names them by slug', async () => {
		mockGet.mockImplementation((url) => {
			if (url === '/apps/openregister/api/registers/20') {
				return Promise.resolve({ data: { id: 20, slug: 'stackiq' } })
			}
			if (url === '/apps/openregister/api/schemas/33') {
				return Promise.resolve({ data: { id: 33, slug: 'organization' } })
			}
			return Promise.reject(new Error(`unexpected ${url}`))
		})
		const bySlug = {
			...manifest,
			pages: manifest.pages.map((p) => ({ ...p, config: { ...p.config, register: 'stackiq' } })),
		}
		const { wrapper, push } = mountAt('ModuleDetail', bySlug)
		await wrapper.vm.onRelatedObjectOpen({ '@self': { id: 'org-9', register: '20', schema: '33' } })
		await settle()
		expect(mockGet).toHaveBeenCalledWith('/apps/openregister/api/registers/20')
		expect(mockGet).toHaveBeenCalledWith('/apps/openregister/api/schemas/33')
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'OrganisatieDetail', params: expect.objectContaining({ objectId: 'org-9' }) }))
	})

	it('asks the API once per register or schema id across clicks', async () => {
		mockGet.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/registers/20') ? { id: 20, slug: 'stackiq' } : { id: 33, slug: 'organization' } }))
		const bySlug = {
			...manifest,
			pages: manifest.pages.map((p) => ({ ...p, config: { ...p.config, register: 'stackiq' } })),
		}
		const { wrapper, push } = mountAt('ModuleDetail', bySlug)
		const before = mockGet.mock.calls.length
		await wrapper.vm.onRelatedObjectOpen({ '@self': { id: 'org-1', register: '20', schema: '33' } })
		await wrapper.vm.onRelatedObjectOpen({ '@self': { id: 'org-2', register: '20', schema: '33' } })
		await settle()
		expect(mockGet.mock.calls.length - before).toBeLessThanOrEqual(2)
		expect(push).toHaveBeenCalledTimes(2)
	})

	it('warns and does nothing when no detail page is bound to the object schema', async () => {
		mockGet.mockResolvedValue({ data: { id: 99, slug: 'contactPerson' } })
		const { wrapper, push } = mountAt('ModuleDetail')
		await wrapper.vm.onRelatedObjectOpen({ '@self': { id: 'c-1', register: '20', schema: '99' } })
		await settle()
		expect(push).not.toHaveBeenCalled()
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('opens nowhere'))
	})

	it('does nothing when the object carries no register, schema or id', async () => {
		const { wrapper, push } = mountAt('ModuleDetail')
		await wrapper.vm.onRelatedObjectOpen({ name: 'no self block' })
		await wrapper.vm.onRelatedObjectOpen({ '@self': { register: '20', schema: 'organization' } })
		expect(push).not.toHaveBeenCalled()
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('resolvedProps still carries nothing new — the click is a listener, not a prop', () => {
		const { wrapper } = mountAt('ModuleDetail')
		expect(wrapper.vm.resolvedProps).not.toHaveProperty('onRelatedObjectClick')
	})
})

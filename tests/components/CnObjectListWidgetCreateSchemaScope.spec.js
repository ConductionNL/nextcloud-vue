/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectListWidget.openCreate() resolves the create-dialog schema INSIDE the
 * list's own register. A slug is not a namespace: on an instance where two apps
 * both own a `page` schema (portaliq + opencatalogi, WOO-564) the bare
 * `/api/schemas/page` resolved instance-wide and served opencatalogi's schema
 * into portaliq's "Add page" dialog — a form asking for fields the
 * register-scoped POST does not know, and missing the ones it requires (400 on
 * every create). Same rule useObjectStore.fetchSchema() already applies (#725).
 */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (path, params = {}) => {
		let out = path
		for (const [key, value] of Object.entries(params)) {
			out = out.replace(`{${key}}`, encodeURIComponent(value))
		}
		return `/index.php${out}`
	},
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}))

const { shallowMount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const PORTALIQ_PAGE = { id: 78, slug: 'page', required: ['title', 'route', 'portal', 'status'], properties: {} }

const mountWidget = (content) => shallowMount(CnObjectListWidget, {
	propsData: { content },
	stubs: { CnDataTable: true },
})

// The widget also lists rows on mount (`/api/objects/{register}/{schema}`);
// only the schema lookups are under test here.
const schemaCalls = () => axios.get.mock.calls.filter(([url]) => String(url).includes('/api/schemas/'))

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockImplementation((url) => Promise.resolve(
		String(url).includes('/api/schemas/') ? { data: PORTALIQ_PAGE } : { data: { results: [], total: 0 } },
	))
})

describe('CnObjectListWidget — create dialog resolves the schema in its own register', () => {
	it('names the register when the list has one, so a colliding slug cannot serve another app\'s schema', async () => {
		const w = mountWidget({ register: 'portaliq', schema: 'page', columns: [{ key: 'title', label: 'Title' }] })

		await w.vm.openCreate()

		expect(schemaCalls()).toHaveLength(1)
		const [url, options] = schemaCalls()[0]
		expect(url).toBe('/index.php/apps/openregister/api/schemas/page')
		expect(options).toEqual({ params: { register: 'portaliq' } })
		// The scoped answer is what the dialog is built from.
		expect(w.vm.createSchema).toEqual(PORTALIQ_PAGE)
		expect(w.vm.showCreate).toBe(true)
	})

	it('keeps the bare lookup when the list has no register (a backend without the parameter is unaffected)', async () => {
		const w = mountWidget({ schema: 'page', columns: [{ key: 'title', label: 'Title' }] })

		await w.vm.openCreate()

		expect(schemaCalls()).toHaveLength(1)
		const [url, options] = schemaCalls()[0]
		expect(url).toBe('/index.php/apps/openregister/api/schemas/page')
		expect(options).toBeUndefined()
	})

	it('resolves the schema again, for the new register, after the list is retargeted', async () => {
		// An instance can be reused for another register (CnRelatedCollections
		// keys children by index). The schema cached for the OLD register is
		// precisely the wrong-app schema the scoping exists to prevent.
		const w = mountWidget({ register: 'portaliq', schema: 'page', columns: [] })
		await w.vm.openCreate()
		expect(schemaCalls()).toHaveLength(1)

		await w.setProps({ content: { register: 'opencatalogi', schema: 'page', columns: [] } })
		expect(w.vm.createSchema).toBeNull()
		expect(w.vm.showCreate).toBe(false)

		await w.vm.openCreate()
		expect(schemaCalls()).toHaveLength(2)
		expect(schemaCalls()[1][1]).toEqual({ params: { register: 'opencatalogi' } })
	})

	it('fetches the schema once and reuses it for the next open', async () => {
		const w = mountWidget({ register: 'portaliq', schema: 'page', columns: [] })

		await w.vm.openCreate()
		w.vm.showCreate = false
		await w.vm.openCreate()

		expect(schemaCalls()).toHaveLength(1)
		expect(w.vm.showCreate).toBe(true)
	})
})

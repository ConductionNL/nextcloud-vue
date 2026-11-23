/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The create dialog of a related list (CnObjectListWidget) gets the list's
 * register, so a `$ref` field is a searchable select of real objects.
 *
 * Without `:register` CnFormDialog degrades every reference to a uuid text
 * box (degradeUnresolvableReference). Ruben hit it on a lead's product line:
 * "Product" asked for a uuid instead of offering his products (pipelinq D9).
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

const LEAD_PRODUCT = {
	id: 12,
	slug: 'lead-product',
	properties: {
		lead: { type: 'string', format: 'uuid', $ref: 'lead', title: 'Lead' },
		product: { type: 'string', format: 'uuid', $ref: 'product', title: 'Product' },
		quantity: { type: 'number', title: 'Quantity' },
	},
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockImplementation((url) => Promise.resolve(String(url).includes('/api/schemas/') ? { data: LEAD_PRODUCT } : { data: { results: [], total: 0 } }))
})

describe('CnObjectListWidget: create dialog references', () => {
	const mountWidget = () => shallowMount(CnObjectListWidget, {
		propsData: {
			content: {
				register: 'pipelinq',
				schema: 'lead-product',
				filter: { lead: 'lead-1' },
				columns: [{ key: 'product', label: 'Product' }],
			},
		},
		stubs: { CnDataTable: true },
	})

	it('passes the list register to the create form', async () => {
		const w = mountWidget()
		await w.vm.openCreate()
		const dialog = w.findComponent({ name: 'CnFormDialog' })
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('register')).toBe('pipelinq')
	})

	it('seeds and locks the parent the list is scoped to', async () => {
		const w = mountWidget()
		await w.vm.openCreate()
		const dialog = w.findComponent({ name: 'CnFormDialog' })
		expect(dialog.props('initialData')).toEqual({ lead: 'lead-1' })
		expect(dialog.props('lockedFields')).toEqual(['lead'])
	})
})

describe('CnObjectListWidget: create form in context', () => {
	const mountWith = (content) => shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'pipelinq', schema: 'lead-product', columns: [{ key: 'product', label: 'Product' }], ...content } },
		stubs: { CnDataTable: true },
	})
	const dialogOf = async (w) => {
		await w.vm.openCreate()
		return w.findComponent({ name: 'CnFormDialog' })
	}

	it('drops operator keys and keys the schema does not declare', async () => {
		const dialog = await dialogOf(mountWith({ filter: { lead: 'lead-1', 'quantity[lt]': 5, nope: 'x' } }))
		expect(dialog.props('initialData')).toEqual({ lead: 'lead-1' })
	})

	it('resolves @workspace tokens into the initial data', async () => {
		const w = shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'pipelinq', schema: 'lead-product', filter: { lead: '@workspace.leadId' }, columns: [] } },
			provide: { cnWorkspaceContext: { leadId: 'lead-9' } },
			stubs: { CnDataTable: true },
		})
		const dialog = await dialogOf(w)
		expect(dialog.props('initialData')).toEqual({ lead: 'lead-9' })
	})

	it('merges createDefaults over the filter-derived data and never locks them', async () => {
		const dialog = await dialogOf(mountWith({ filter: { lead: 'lead-1' }, createDefaults: { quantity: 3, ghost: 1 } }))
		expect(dialog.props('initialData')).toEqual({ lead: 'lead-1', quantity: 3 })
		expect(dialog.props('lockedFields')).toEqual(['lead'])
	})

	it('leaves the parent editable with lockFilterFields: false', async () => {
		const dialog = await dialogOf(mountWith({ filter: { lead: 'lead-1' }, lockFilterFields: false }))
		expect(dialog.props('initialData')).toEqual({ lead: 'lead-1' })
		expect(dialog.props('lockedFields')).toEqual([])
	})
})

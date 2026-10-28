/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqOfferte "Regels" offers two ways to add a line: "Product toevoegen"
 * and "Eigen regel toevoegen". `content.addActions` lists the extra adds, each
 * opening the list's own create form with its `createDefaults` merged over the
 * list's (`kind: "own"` for a line of your own).
 *
 * @spec openspec/changes/object-list-add-actions/specs/object-list/spec.md#requirement-a-list-can-offer-more-than-one-add
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => `/index.php${path}` }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}))

const { shallowMount, mount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const LINE = {
	id: 13,
	slug: 'salesQuoteLine',
	properties: {
		quote: { type: 'string', format: 'uuid', $ref: 'salesQuote', title: 'Quote' },
		kind: { type: 'string', enum: ['catalogue', 'own'], title: 'Kind' },
		description: { type: 'string', title: 'Description' },
	},
}

const CONTENT = {
	register: 'pipelinq',
	schema: 'salesQuoteLine',
	filter: { quote: 'q-1' },
	columns: [{ key: 'description', label: 'Product' }],
	allowCreate: true,
	addLabel: 'Add product',
	createDefaults: { kind: 'catalogue' },
	addActions: [{ label: 'Add own line', icon: 'Pencil', createDefaults: { kind: 'own' } }],
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockImplementation((url) => Promise.resolve(String(url).includes('/api/schemas/') ? { data: LINE } : { data: { results: [{ id: 'l-1', description: 'Website' }], total: 1 } }))
})

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

describe('CnObjectListWidget addActions', () => {
	it('opens the create form with the extra add\'s defaults over the list\'s', async () => {
		const w = shallowMount(CnObjectListWidget, { propsData: { content: CONTENT }, stubs: { CnDataTable: true } })
		await w.vm.openCreateWith({ kind: 'own' })
		expect(w.findComponent({ name: 'CnFormDialog' }).props('initialData')).toEqual({ quote: 'q-1', kind: 'own' })
	})

	it('keeps the list\'s own defaults on the plain Add', async () => {
		const w = shallowMount(CnObjectListWidget, { propsData: { content: CONTENT }, stubs: { CnDataTable: true } })
		await w.vm.openCreateWith({ kind: 'own' })
		w.vm.showCreate = false
		await w.vm.openCreate()
		expect(w.findComponent({ name: 'CnFormDialog' }).props('initialData')).toEqual({ quote: 'q-1', kind: 'catalogue' })
	})

	it('draws a button per extra add beside the list\'s Add, labels translated', async () => {
		const w = mount(CnObjectListWidget, {
			propsData: { content: CONTENT },
			global: { provide: { cnTranslate: (key) => `T(${key})` }, stubs: { CnDataTable: true, CnFormDialog: true } },
		})
		await flush()
		const buttons = w.findAll('[data-testid="cn-object-list-widget-add-action"]')
		expect(buttons).toHaveLength(1)
		expect(buttons[0].text()).toContain('T(Add own line)')
	})
})

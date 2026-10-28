/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqOfferte "Regels" ends its lines with the catalogue note on the left
 * and a totals box on the right: Subtotaal, Btw and Totaal of the quote the
 * list sits on. `content.totals` lists those rows, read from the page record.
 *
 * @spec openspec/changes/object-list-add-actions/specs/object-list/spec.md#requirement-a-list-can-end-in-the-totals-of-the-record-it-sits-on
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => `/index.php${path}` }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const axios = jest.requireMock('@nextcloud/axios').default
const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const QUOTE = { id: 'q-1', subtotal: 4428, vatRate: 21, vatAmount: 929.88, total: 5357.88, currency: 'EUR' }
const TOTALS = [
	{ label: 'Subtotal', path: 'subtotal', format: 'currency' },
	{ label: 'VAT', path: 'vatAmount', format: 'currency' },
	{ label: 'Total', path: 'total', format: 'currency', emphasis: true },
]

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: [{ id: 'l-1', description: 'Website' }], total: 1 } })
})

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((r) => setTimeout(r, 0))
	}
}

function mountList(content) {
	return mount(CnObjectListWidget, {
		propsData: { content: { register: 'pipelinq', schema: 'salesQuoteLine', columns: [{ key: 'description', label: 'Product' }], ...content } },
		global: {
			provide: { cnTranslate: (key) => `T(${key})`, cnObjectContext: { objectId: 'q-1', object: QUOTE } },
			stubs: { CnDataTable: true, CnFormDialog: true },
		},
	})
}

describe('CnObjectListWidget totals', () => {
	it('draws the record\'s totals beside the footnote', async () => {
		const w = mountList({ footnote: 'Products come from the catalogue.', totals: TOTALS })
		await flush()
		const foot = w.find('[data-testid="cn-object-list-widget-foot"]')
		expect(foot.exists()).toBe(true)
		expect(foot.find('.cn-object-list-widget__footnote').text()).toBe('T(Products come from the catalogue.)')
		const labels = foot.findAll('dt').map((d) => d.text())
		const values = foot.findAll('dd').map((d) => d.text())
		expect(labels).toEqual(['T(Subtotal)', 'T(VAT)', 'T(Total)'])
		expect(values[2]).toMatch(/5[.,]?357[.,]88/)
		expect(foot.findAll('.cn-object-list-widget__total--emphasis')).toHaveLength(2)
	})

	it('keeps the footnote as it was without totals', async () => {
		const w = mountList({ footnote: 'Products come from the catalogue.' })
		await flush()
		expect(w.find('[data-testid="cn-object-list-widget-foot"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-object-list-widget-footnote"]').exists()).toBe(true)
	})

	it('draws the box on the sunken ground with the total set apart', () => {
		const source = readFileSync(resolve(__dirname, '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'), 'utf8')
		expect(source).toMatch(/\.cn-object-list-widget__totals \{[^}]*background: var\(--cn-board-sunken-ground/)
		expect(source).toMatch(/\.cn-object-list-widget__total--emphasis \{[^}]*border-top: 1px solid/)
	})
})

describe('CnObjectListWidget totals labels', () => {
	it('fills a label from the record after translating it', async () => {
		const w = mountList({ totals: [{ label: 'VAT {vatRate}%', path: 'vatAmount', format: 'currency' }] })
		await flush()
		expect(w.find('[data-testid="cn-object-list-widget-foot"] dt').text()).toBe('T(VAT 21%)')
	})
})

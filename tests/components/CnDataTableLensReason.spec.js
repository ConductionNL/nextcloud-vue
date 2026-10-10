// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * CnDataTable in self-fetch mode (what a manifest `object-table` widget with
 * `source.filter._recent` drives) explains an unavailable personal lens in
 * its empty row, and keeps `emptyText` otherwise.
 *
 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page
 */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => `/index.php${p}`,
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default
const CnWidgetObjectTable = require('../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve))

const columns = [{ key: 'title', label: 'Title' }]

/**
 * @param {object} lenses The `@self.lenses` the response carries, or null for none.
 * @return {void}
 */
function respondWith(lenses) {
	axios.get.mockResolvedValue({ data: { results: [], total: 0, ...(lenses ? { '@self': { lenses } } : {}) } })
}

/**
 * @param {object} props Extra props.
 * @return {Promise<object>} The wrapper after the fetch settled.
 */
async function mountTable(props = {}) {
	const w = mount(CnDataTable, {
		propsData: { register: 'dossiq', schemaId: 'case', columns, fetchParams: { _recent: true }, ...props },
		stubs: { CnCellRenderer: true },
	})
	await flush()
	return w
}

const emptyRow = (w) => w.find('[data-testid="cn-object-list-empty"]').text()

describe('CnDataTable lens reason', () => {
	beforeEach(() => axios.get.mockReset())

	it.each([
		['audit-trail-disabled', 'This server does not keep track of what you open.'],
		['anonymous', 'Log in to see what you opened recently.'],
		['read-history-unavailable', 'Your recent items are not available right now.'],
	])('explains %s in the empty row', async (reason, text) => {
		respondWith({ recent: { available: false, reason } })
		const w = await mountTable()
		expect(emptyRow(w)).toBe(text)
		expect(w.find('[data-testid="cn-data-table-lens-reason"]').exists()).toBe(true)
	})

	it('keeps emptyText without a report', async () => {
		respondWith(null)
		const w = await mountTable({ emptyText: 'Nothing opened yet' })
		expect(emptyRow(w)).toBe('Nothing opened yet')
		expect(w.find('[data-testid="cn-data-table-lens-reason"]').exists()).toBe(false)
	})

	it('keeps emptyText when the lens is available', async () => {
		respondWith({ recent: { available: true, reason: null } })
		const w = await mountTable({ emptyText: 'Nothing opened yet' })
		expect(emptyRow(w)).toBe('Nothing opened yet')
	})

	it('keeps emptyText after a failed fetch', async () => {
		axios.get.mockRejectedValue(new Error('boom'))
		const w = await mountTable({ emptyText: 'Nothing opened yet' })
		expect(emptyRow(w)).toBe('Nothing opened yet')
	})

	it('uses lensReasonTexts', async () => {
		respondWith({ recent: { available: false, reason: 'audit-trail-disabled' } })
		const w = await mountTable({ lensReasonTexts: { 'audit-trail-disabled': 'Deze server houdt niet bij welke zaken je opent.' } })
		expect(emptyRow(w)).toBe('Deze server houdt niet bij welke zaken je opent.')
	})

	it('a host empty slot still wins', async () => {
		respondWith({ recent: { available: false, reason: 'anonymous' } })
		const w = mount(CnDataTable, {
			propsData: { register: 'dossiq', schemaId: 'case', columns },
			slots: { empty: '<span class="host-empty">Host empty</span>' },
			stubs: { CnCellRenderer: true },
		})
		await flush()
		expect(emptyRow(w)).toBe('Host empty')
	})
})

describe('CnWidgetObjectTable lens reason', () => {
	beforeEach(() => axios.get.mockReset())

	it('forwards lensReasonTexts to the table', () => {
		const texts = { 'recent.anonymous': 'Log in first.' }
		const w = mount(CnWidgetObjectTable, {
			propsData: {
				title: 'Recently opened',
				columns,
				source: { register: 'dossiq', schema: 'case', filter: { _recent: true } },
				lensReasonTexts: texts,
			},
			stubs: { CnDataTable: true, CnWidgetWrapper: { template: '<div><slot /></div>' } },
		})
		expect(w.vm.innerProps.lensReasonTexts).toEqual(texts)
	})
})

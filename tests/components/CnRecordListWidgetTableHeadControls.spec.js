/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.sortable` makes every `table` head sort, and `content.filterable`
 * puts a filter on every head that offers the texts the column holds
 * (DqZaaktype "Berichten aan de aanvrager": a sort and a funnel per head).
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const ROWS = [
	{ moment: 'Zaak ontvangen', channel: 'Berichtenbox', name: 'Ontvangstbevestiging' },
	{ moment: 'Besluit genomen', channel: 'E-mail', name: 'Het besluit' },
	{ moment: 'Termijn verlengd', channel: 'Berichtenbox', name: 'Nieuwe datum' },
]

const COLUMNS = [
	{ label: 'Moment', value: '{moment}' },
	{ label: 'Channel', value: '{channel}' },
	{ label: 'Message', value: '{name}' },
]

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

/**
 * Mount a table with the given extra content.
 *
 * @param {object} extra Extra content keys.
 * @return {Promise<object>} The wrapper.
 */
async function mountTable(extra) {
	const w = mount(CnRecordListWidget, {
		props: { content: { endpointSource: { url: '/apps/dossiq/api/messages', responsePath: 'results' }, presentation: 'table', columns: COLUMNS, ...extra } },
	})
	await flush()
	return w
}

const firstColumn = (w) => w.findAll('[data-testid="cn-record-list-item"]').map((row) => row.find('td').text())

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: { results: ROWS } })
})

describe('CnRecordListWidget table head controls', () => {
	it('keeps plain heads without the opt-ins', async () => {
		const w = await mountTable({})
		expect(w.find('[data-testid="cn-record-list-sort-col-0"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-record-list-filter-col-0"]').exists()).toBe(false)
	})

	it('sorts by any head with content.sortable', async () => {
		const w = await mountTable({ sortable: true })
		await w.find('[data-testid="cn-record-list-sort-col-0"]').trigger('click')
		expect(firstColumn(w)).toEqual(['Besluit genomen', 'Termijn verlengd', 'Zaak ontvangen'])
		await w.find('[data-testid="cn-record-list-sort-col-0"]').trigger('click')
		expect(firstColumn(w)).toEqual(['Zaak ontvangen', 'Termijn verlengd', 'Besluit genomen'])
	})

	it('offers each text of a column once and keeps the rows with a chosen one', async () => {
		const w = await mountTable({ filterable: true })
		expect(w.find('[data-testid="cn-record-list-filter-col-1"]').exists()).toBe(true)
		expect(w.vm.tableFilterOptions('col-1')).toEqual(['Berichtenbox', 'E-mail'])
		w.vm.toggleTableFilter('col-1', 'Berichtenbox')
		await nextTick()
		expect(firstColumn(w)).toEqual(['Zaak ontvangen', 'Termijn verlengd'])
		w.vm.toggleTableFilter('col-1', 'Berichtenbox')
		await nextTick()
		expect(firstColumn(w)).toHaveLength(3)
	})
})

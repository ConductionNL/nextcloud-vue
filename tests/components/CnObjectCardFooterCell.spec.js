/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record layout's `footerCell` puts one part in the footer before the
 * date, drawn through the page column it names, as a meta part is: the
 * handler's picture and name on the DqZakenSorteren cards.
 */
import { mount } from '@vue/test-utils'
import CnObjectCard from '../../src/components/CnObjectCard/CnObjectCard.vue'

const DAY = 24 * 60 * 60 * 1000
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10)

const schema = { title: 'Case', configuration: { objectNameField: 'title' }, properties: { title: {}, caseType: {}, deadline: {} } }
const object = { id: 'c1', title: 'Melding terras Markt', identifier: '2026-0066', caseType: 'ct-uuid-1', handler: 'pieter', deadline: iso(-2) }
const columns = {
	caseType: { key: 'caseType', label: 'Type', formatter: 'caseTypeName' },
	handler: { key: 'handler', label: 'Handler', widget: 'user' },
}
const formatters = { caseTypeName: (value) => (value === 'ct-uuid-1' ? 'Woo-verzoek' : String(value)) }
const DUTCH = { Overdue: 'Te laat', Soon: 'Bijna' }

/**
 * @param {object} layout The card layout.
 * @param {object} [extra] Object overrides.
 * @return {object} The wrapper.
 */
function mountCard(layout, extra = {}) {
	return mount(CnObjectCard, {
		props: { object: { ...object, ...extra }, schema, layout, cardFieldColumns: columns },
		global: {
			provide: { cnLook: 'board', cnFormatters: formatters, cnTranslate: (s) => DUTCH[s] || s },
			stubs: { CnCellRenderer: { name: 'CnCellRenderer', props: ['value', 'widget', 'formatter'], template: '<span class="cell" :data-widget="widget">{{ value }}</span>' } },
		},
	})
}

describe('CnObjectCard footerCell', () => {
	it('draws the part through its column widget in the footer, before the date', () => {
		const card = mountCard({ footerCell: 'handler', footerDate: { field: 'deadline' } })
		const foot = card.find('[data-testid="cn-object-card-foot"]')
		const cell = foot.find('[data-testid="cn-object-card-foot-cell"] .cell[data-widget="user"]')
		expect(cell.exists()).toBe(true)
		expect(cell.text()).toBe('pieter')
		expect(foot.find('[data-testid="cn-object-card-foot-cell"] + [data-testid="cn-object-card-date"]').exists()).toBe(true)
	})

	it('reads as text through the column formatter without a widget', () => {
		const card = mountCard({ footerCell: 'caseType' })
		expect(card.find('[data-testid="cn-object-card-foot-cell"]').text()).toBe('Woo-verzoek')
	})

	it('leaves the footer out while the field is empty', () => {
		const card = mountCard({ footerCell: 'handler' }, { handler: '' })
		expect(card.find('[data-testid="cn-object-card-foot"]').exists()).toBe(false)
	})
})

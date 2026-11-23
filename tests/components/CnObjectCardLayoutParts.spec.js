/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board card's record layout parts resolve like table cells: a part whose
 * field names a page column goes through that column's formatter or widget
 * (the case type uuid reads as its name through `caseTypeName`). A pill can
 * take its tone and label from a date through the due rules: "Te laat"
 * (overdue, red), "Bijna" (within 7 days, orange) or nothing.
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

describe('CnObjectCard layout parts through page columns', () => {
	it('formats a meta part with its column formatter', () => {
		const card = mountCard({ meta: ['caseType'] })
		expect(card.find('[data-testid="cn-object-card-meta"]').text()).toBe('Woo-verzoek')
	})

	it('draws a meta part with its column widget', () => {
		const card = mountCard({ meta: ['caseType', 'handler'] })
		const meta = card.find('[data-testid="cn-object-card-meta"]')
		const cell = meta.find('.cell[data-widget="user"]')
		expect(cell.exists()).toBe(true)
		expect(cell.text()).toBe('pieter')
		expect(meta.text().replace(/\s+/g, ' ')).toBe('Woo-verzoek · pieter')
	})

	it('formats the number and title parts the same way', () => {
		const card = mountCard({ number: 'caseType' })
		expect(card.find('[data-testid="cn-object-card-number"]').text()).toBe('Woo-verzoek')
	})
})

describe('CnObjectCard date pill', () => {
	const due = { headPill: { field: 'deadline', due: { soonWithin: 7 }, labels: { overdue: 'Overdue', soon: 'Soon' } } }

	it('reads overdue in red', () => {
		const pill = mountCard(due, { deadline: iso(-2) }).find('[data-testid="cn-object-card-head-pill"]')
		expect(pill.text()).toBe('Te laat')
		expect(pill.classes()).toContain('cn-status-badge--error')
	})

	it('reads soon in orange within the window', () => {
		const pill = mountCard(due, { deadline: iso(3) }).find('[data-testid="cn-object-card-head-pill"]')
		expect(pill.text()).toBe('Bijna')
		expect(pill.classes()).toContain('cn-status-badge--warning')
	})

	it('draws nothing for a date further off', () => {
		expect(mountCard(due, { deadline: iso(30) }).find('[data-testid="cn-object-card-head-pill"]').exists()).toBe(false)
	})

	it('takes variantWhen rules, labelled by variant', () => {
		const layout = { headPill: { field: 'deadline', variantWhen: [{ op: 'lt', value: 0, variant: 'error' }, { op: 'lte', value: 7, variant: 'warning' }], labels: { error: 'Overdue', warning: 'Soon' } } }
		expect(mountCard(layout, { deadline: iso(-1) }).find('[data-testid="cn-object-card-head-pill"]').text()).toBe('Te laat')
		expect(mountCard(layout, { deadline: iso(5) }).find('[data-testid="cn-object-card-head-pill"]').text()).toBe('Bijna')
		expect(mountCard(layout, { deadline: iso(20) }).find('[data-testid="cn-object-card-head-pill"]').exists()).toBe(false)
	})
})

describe('the cardLayout schema', () => {
	it('lets a pill declare due and variantWhen', () => {
		const schemaJson = require('../../src/schemas/app-manifest-v2.schema.json')
		const layout = schemaJson.$defs.page.properties.config.properties.cardLayout.properties
		for (const pill of ['headPill', 'footerPill']) {
			expect(layout[pill].properties.due).toBeDefined()
			expect(layout[pill].properties.variantWhen).toBeDefined()
		}
	})
})

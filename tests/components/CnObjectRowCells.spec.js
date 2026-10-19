/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list-view row with leading and trailing cells (DqTeamwachtrij): the age
 * before the title ("6 dagen", red past three days), a meta line from a
 * template, then the case type badge and the due text, the way a table
 * column renders them, so the queue can drop its table header.
 *
 * @spec openspec/changes/index-row-list-cells/specs/object-row/spec.md#requirement-a-list-row-can-carry-leading-and-trailing-cells
 */
import { mount } from '@vue/test-utils'
import CnObjectList from '../../src/components/CnObjectList/CnObjectList.vue'
import CnObjectRow from '../../src/components/CnObjectRow/CnObjectRow.vue'

const DAY = 24 * 60 * 60 * 1000
const CASE = {
	id: 'z-76',
	title: 'Afvalinzameling Oosthaven 2025',
	identifier: '2026-0076',
	requester: 'Dagblad Drechtsteden',
	status: '',
	priority: 'hoog',
	createdAt: new Date(Date.now() - 6 * DAY - 60 * 60 * 1000).toISOString(),
	caseType: 'Woo-verzoek',
	deadline: new Date(Date.now() - 2 * DAY).toISOString().slice(0, 10),
}

const CONFIG = {
	titleField: 'title',
	subtitleTemplate: '{identifier} · {requester} · {status} · prioriteit {priority}',
	leading: { key: 'createdAt', widget: 'age', widgetProps: { variantWhen: [{ op: 'gte', value: 3, variant: 'error' }] }, width: '80px' },
	trailing: [
		{ key: 'caseType', widget: 'badge', widgetProps: { colorMap: { 'Woo-verzoek': 'error' } } },
		{ key: 'deadline', widget: 'date', widgetProps: { due: {} } },
	],
}

/**
 * Mount one row.
 *
 * @param {object} config The row config.
 * @return {import('@vue/test-utils').VueWrapper} The row.
 */
function mountRow(config) {
	return mount(CnObjectRow, { props: { object: CASE, config } })
}

describe('CnObjectRow leading and trailing cells', () => {
	it('draws the age before the title, in the error tone past its threshold', () => {
		const w = mountRow(CONFIG)
		const lead = w.find('[data-testid="cn-object-row-lead"]')
		expect(lead.exists()).toBe(true)
		expect(lead.text()).toBe('6 days')
		expect(lead.attributes('style')).toContain('width: 80px')
		expect(lead.html()).toMatch(/error/)
		const children = [...w.element.children]
		expect(children.indexOf(lead.element)).toBeLessThan(children.indexOf(w.find('.cn-object-row__main').element))
	})

	it('fills the meta line from a template, dropping an empty part with its separator', () => {
		expect(mountRow(CONFIG).find('.cn-object-row__subtitle').text()).toBe('2026-0076 · Dagblad Drechtsteden · prioriteit hoog')
	})

	it('draws the badge and the due text after the title, in order', () => {
		const trail = mountRow(CONFIG).findAll('[data-testid="cn-object-row-trail"]')
		expect(trail).toHaveLength(2)
		expect(trail[0].text()).toBe('Woo-verzoek')
		expect(trail[1].find('[data-testid="cn-cell-renderer-due"]').exists()).toBe(true)
		expect(trail[1].text()).toMatch(/2 days overdue|overdue/)
	})

	it('accepts one trailing cell as an object, and draws nothing without the keys', () => {
		expect(mountRow({ trailing: CONFIG.trailing[0] }).findAll('[data-testid="cn-object-row-trail"]')).toHaveLength(1)
		const plain = mountRow({ titleField: 'title' })
		expect(plain.find('[data-testid="cn-object-row-lead"]').exists()).toBe(false)
		expect(plain.find('[data-testid="cn-object-row-trail"]').exists()).toBe(false)
	})

	it('reaches the rows through CnObjectList config, as an index page list view passes it', () => {
		const w = mount(CnObjectList, { props: { objects: [CASE], config: CONFIG } })
		expect(w.find('[data-testid="cn-object-row-lead"]').text()).toBe('6 days')
	})
})

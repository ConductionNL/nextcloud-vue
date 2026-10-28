/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index row that opens to a sub-table (board PqPipelines): closed it shows
 * the title, a badge, the description, a list as chips joined by a separator
 * and a meta line; open it shows the list as a table and a footer action.
 *
 * @spec openspec/changes/index-expandable-rows/specs/index-expandable-rows/spec.md
 */
import { mount } from '@vue/test-utils'
import CnExpandableRow from '../../src/components/CnExpandableRow/CnExpandableRow.vue'

const pipeline = {
	id: 'p1',
	title: 'Vragen en meldingen',
	description: 'Verzoeken van inwoners',
	isDefault: true,
	stages: [
		{ name: 'Nieuw', isDefault: true, probability: 10 },
		{ name: 'In behandeling', probability: 50 },
		{ name: 'Afgerond', isWon: true, isClosed: true, probability: 100 },
		{ name: 'Afgewezen', isClosed: true, probability: 0 },
	],
}

const layout = {
	title: 'title',
	badge: { when: { field: 'isDefault', op: 'eq', value: true }, label: 'Default' },
	description: 'description',
	chips: {
		field: 'stages',
		each: 'name',
		tones: [
			{ when: { field: 'isWon', op: 'eq', value: true }, variant: 'success' },
			{ when: { field: 'isClosed', op: 'eq', value: true }, variant: 'error' },
		],
	},
	meta: ['{stages|count} stages'],
	table: {
		field: 'stages',
		columns: [
			{ label: 'Order', as: 'order' },
			{ key: 'name', label: 'Stage', strong: true },
			{ key: 'probability', label: 'Chance', as: 'bar' },
			{ key: 'isDefault', label: 'Start', as: 'check', text: 'New items start here' },
			{ key: 'isClosed', label: 'Closed', as: 'yesNo' },
			{ label: 'Result', as: 'pill', tones: [
				{ when: { field: 'isWon', op: 'eq', value: true }, variant: 'success', text: 'Won' },
				{ when: { field: 'isClosed', op: 'eq', value: true }, variant: 'error', text: 'Lost' },
			] },
		],
		note: 'Drag a stage to change the order.',
		action: { id: 'add-stage', label: 'Add stage' },
	},
	buttons: [{ action: 'edit', label: 'Edit' }],
}

const NL = { Default: 'Standaard', '{stages|count} stages': '{stages|count} fases', Won: 'Gewonnen', Lost: 'Verloren' }

/**
 * @param {object} [props] Extra props.
 * @return {object} The wrapper.
 */
function mountRow(props = {}) {
	return mount(CnExpandableRow, {
		props: { object: pipeline, layout, ...props },
		global: { provide: { cnTranslate: (s) => NL[s] || s } },
	})
}

describe('CnExpandableRow', () => {
	it('closed: title, badge, description, separated chips with tones and the meta line', () => {
		const row = mountRow()
		expect(row.find('[data-testid="cn-expandable-row-title"]').text()).toBe('Vragen en meldingen')
		expect(row.find('[data-testid="cn-expandable-row-badge"]').text()).toBe('Standaard')
		expect(row.find('[data-testid="cn-expandable-row-description"]').text()).toBe('Verzoeken van inwoners')
		const chips = row.findAllComponents({ name: 'CnStatusBadge' }).filter((c) => c.classes().includes('cn-expandable-row__chip'))
		expect(chips.map((c) => [c.props('label'), c.props('variant')])).toEqual([
			['Nieuw', 'default'],
			['In behandeling', 'default'],
			['Afgerond', 'success'],
			['Afgewezen', 'error'],
		])
		expect(row.findAll('.cn-expandable-row__separator')).toHaveLength(3)
		expect(row.find('[data-testid="cn-expandable-row-meta"]').text()).toBe('4 fases')
		expect(row.find('[data-testid="cn-expandable-row-table"]').exists()).toBe(false)
		expect(row.find('[data-testid="cn-expandable-row-toggle"]').attributes('aria-expanded')).toBe('false')
	})

	it('open: the list as a table instead of the chips, with the note and the footer action', async () => {
		const row = mountRow()
		await row.find('[data-testid="cn-expandable-row-toggle"]').trigger('click')
		expect(row.find('[data-testid="cn-expandable-row-toggle"]').attributes('aria-expanded')).toBe('true')
		expect(row.find('[data-testid="cn-expandable-row-chips"]').exists()).toBe(false)
		const rows = row.findAll('[data-testid="cn-expandable-row-table"] tbody tr')
		expect(rows).toHaveLength(4)
		const cells = (i) => rows[i].findAll('td').map((td) => td.text())
		expect(cells(0)).toEqual(['1', 'Nieuw', '10%', 'New items start here', 'No', ''])
		expect(cells(2)).toEqual(['3', 'Afgerond', '100%', '', 'Yes', 'Gewonnen'])
		expect(cells(3)[5]).toBe('Verloren')
		expect(rows[0].find('.cn-expandable-row__bar-fill').attributes('style')).toContain('width: 10%')
		expect(row.find('[data-testid="cn-expandable-row-note"]').text()).toBe('Drag a stage to change the order.')
		await row.find('[data-testid="cn-expandable-row-footer-action"]').trigger('click')
		expect(row.emitted('action')[0][0]).toEqual({ id: 'add-stage', row: pipeline })
	})

	it('opens when asked to, and a header button names its action', async () => {
		const row = mountRow({ open: true })
		expect(row.find('[data-testid="cn-expandable-row-table"]').exists()).toBe(true)
		await row.find('[data-testid="cn-expandable-row-button-edit"]').trigger('click')
		expect(row.emitted('action')[0][0]).toEqual({ id: 'edit', row: pipeline })
	})
})

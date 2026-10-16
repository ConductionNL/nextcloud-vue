/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnCountdownWidget as the "Termijn" card of board DqZaak: "27 dagen", a
 * caption with the date, a bar for the time passed, one action, and no icon
 * circle in the board look.
 *
 * @spec openspec/changes/countdown-board-look/specs/countdown-board-look/spec.md
 */
import { mount } from '@vue/test-utils'
import CnCountdownWidget from '../../src/components/CnCountdownWidget/CnCountdownWidget.vue'

function daysFromToday(offset) {
	const d = new Date()
	d.setDate(d.getDate() + offset)
	d.setHours(12, 0, 0, 0)
	return d.toISOString()
}

const TERM = {
	field: 'deadline',
	label: 'Termijn',
	daysLabel: { one: '{count} dag', other: '{count} dagen' },
	caption: 'Beslissen uiterlijk {date}',
	startField: 'registeredAt',
	action: { label: 'Termijn opschorten', type: 'handler', handler: 'suspendTerm', args: ['@objectId'] },
}

function mountTile(content, record, provide = {}) {
	return mount(CnCountdownWidget, {
		props: { content, objectData: record },
		global: { provide },
	})
}

describe('CnCountdownWidget board term card', () => {
	const record = { id: 'case-1', deadline: daysFromToday(27), registeredAt: daysFromToday(-3) }

	it('reads the days through daysLabel, the caption with the date, and no icon in the board look', () => {
		const w = mountTile(TERM, record, { cnLook: 'board' })
		expect(w.find('.cn-countdown-widget__value').text()).toBe('27 dagen')
		expect(w.find('[data-testid="cn-countdown-sub"]').text()).toMatch(/^Beslissen uiterlijk \S+ \S+ \d{4}$/)
		expect(w.find('.cn-countdown-widget__icon').exists()).toBe(false)
		expect(w.classes()).toContain('cn-kpi-card--board')
	})

	it('fills the bar with the share of the term that has passed', () => {
		const w = mountTile(TERM, record)
		const bar = w.find('[data-testid="cn-countdown-progress"]')
		expect(Number(bar.attributes('aria-valuenow'))).toBe(10)
	})

	it('runs its action through the page dispatcher with the record tokens resolved', async () => {
		const dispatch = jest.fn()
		const w = mountTile(TERM, record, { cnDispatchAction: dispatch })
		await w.find('[data-testid="cn-countdown-action"]').trigger('click')
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ handler: 'suspendTerm', args: ['case-1'] }))
	})

	it('keeps the icon and the default texts outside the board look and without the new keys', () => {
		const w = mountTile({ field: 'deadline' }, record)
		expect(w.find('.cn-countdown-widget__icon').exists()).toBe(true)
		expect(w.text()).toContain('27 days left')
		expect(w.find('[data-testid="cn-countdown-progress"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-countdown-action"]').exists()).toBe(false)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnCountdownWidget as the term card of board DqZaakTermijn in its five
 * states: on track, two weeks left, one week left, passed and already
 * extended, each with its own texts and notice, and two actions of which
 * one greys out once the term has passed or was extended.
 *
 * @spec openspec/changes/countdown-term-states/specs/countdown-term-states/spec.md
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
	thresholds: { warn: 14, danger: 7 },
	extendedField: 'extendedOn',
	states: {
		warning: { notice: { lead: 'Let op de termijn', text: 'Over twee weken moet het besluit de deur uit.' } },
		danger: { notice: { lead: 'Urgent: nog een week', text: 'Zonder besluit verstrijkt de termijn.' } },
		overdue: {
			headline: 'Termijn verlopen',
			caption: 'Beslisdatum was {date}, {count} dagen geleden',
			notice: { lead: 'De wettelijke termijn is verstreken', text: 'Neem het besluit zo snel mogelijk.' },
		},
		extended: { notice: { text: 'Verdagen kan één keer.' } },
	},
	actions: [
		{ label: 'Verdagen', type: 'handler', handler: 'extendTerm', args: ['@objectId'], disabledIn: ['overdue', 'extended'] },
		{ label: 'Termijn opschorten', type: 'handler', handler: 'suspendTerm', args: ['@objectId'] },
	],
}

function mountTile(record, content = TERM, provide = {}) {
	return mount(CnCountdownWidget, {
		props: { content, objectData: record },
		global: { provide },
	})
}

function buttons(w) {
	return w.findAll('[data-testid="cn-countdown-action"]').map((b) => ({ label: b.text(), disabled: b.attributes('disabled') !== undefined }))
}

describe('CnCountdownWidget term states', () => {
	it('on track: no notice and both actions enabled', () => {
		const w = mountTile({ id: 'c1', deadline: daysFromToday(27) })
		expect(w.find('.cn-countdown-widget__value').text()).toBe('27 dagen')
		expect(w.find('[data-testid="cn-countdown-notice"]').exists()).toBe(false)
		expect(buttons(w)).toEqual([
			{ label: 'Verdagen', disabled: false },
			{ label: 'Termijn opschorten', disabled: false },
		])
	})

	it('two weeks left: the warning notice', () => {
		const w = mountTile({ id: 'c1', deadline: daysFromToday(14) })
		const notice = w.find('[data-testid="cn-countdown-notice"]')
		expect(notice.classes()).toContain('notecard--warning')
		expect(notice.text()).toContain('Let op de termijn')
		expect(notice.text()).toContain('Over twee weken moet het besluit de deur uit.')
	})

	it('one week left: the danger notice in the error tone', () => {
		const w = mountTile({ id: 'c1', deadline: daysFromToday(7) })
		const notice = w.find('[data-testid="cn-countdown-notice"]')
		expect(notice.classes()).toContain('notecard--error')
		expect(notice.text()).toContain('Urgent: nog een week')
	})

	it('passed: its own headline and caption, the days counted as past, and Verdagen greyed out', () => {
		const w = mountTile({ id: 'c1', deadline: daysFromToday(-3) })
		expect(w.find('.cn-countdown-widget__value').text()).toBe('Termijn verlopen')
		expect(w.find('[data-testid="cn-countdown-sub"]').text()).toMatch(/^Beslisdatum was \S+ \S+ \d{4}, 3 dagen geleden$/)
		expect(w.find('[data-testid="cn-countdown-notice"]').text()).toContain('De wettelijke termijn is verstreken')
		expect(buttons(w)).toEqual([
			{ label: 'Verdagen', disabled: true },
			{ label: 'Termijn opschorten', disabled: false },
		])
		expect(w.find('[data-testid="cn-countdown-action"]').attributes('aria-disabled')).toBe('true')
	})

	it('already extended: the extended notice and Verdagen greyed out', () => {
		const w = mountTile({ id: 'c1', deadline: daysFromToday(20), extendedOn: daysFromToday(-5) })
		expect(w.find('.cn-countdown-widget__value').text()).toBe('20 dagen')
		const notice = w.find('[data-testid="cn-countdown-notice"]')
		expect(notice.classes()).toContain('notecard--info')
		expect(notice.text()).toContain('Verdagen kan één keer.')
		expect(buttons(w)[0]).toEqual({ label: 'Verdagen', disabled: true })
	})

	it('extended and a week left: the danger notice shows and Verdagen stays greyed out', () => {
		const w = mountTile({ id: 'c1', deadline: daysFromToday(5), extendedOn: daysFromToday(-10) })
		expect(w.find('[data-testid="cn-countdown-notice"]').text()).toContain('Urgent: nog een week')
		expect(buttons(w)[0].disabled).toBe(true)
	})

	it('runs an enabled action with the record tokens resolved, without disabledIn', async () => {
		const dispatch = jest.fn()
		const w = mountTile({ id: 'c1', deadline: daysFromToday(27) }, TERM, { cnDispatchAction: dispatch })
		await w.findAll('[data-testid="cn-countdown-action"]')[0].trigger('click')
		expect(dispatch).toHaveBeenCalledTimes(1)
		const sent = dispatch.mock.calls[0][0]
		expect(sent).toEqual(expect.objectContaining({ handler: 'extendTerm', args: ['c1'] }))
		expect(sent.disabledIn).toBeUndefined()
	})

	it('does not run a greyed-out action', () => {
		const dispatch = jest.fn()
		const w = mountTile({ id: 'c1', deadline: daysFromToday(-1) }, TERM, { cnDispatchAction: dispatch })
		w.vm.runAction(TERM.actions[0])
		expect(dispatch).not.toHaveBeenCalled()
	})

	it('a notice type named in the config wins over the state default', () => {
		const content = { ...TERM, states: { onTrack: { notice: { text: 'Op schema.', type: 'success' } } } }
		const w = mountTile({ id: 'c1', deadline: daysFromToday(27) }, content)
		expect(w.find('[data-testid="cn-countdown-notice"]').classes()).toContain('notecard--success')
	})

	it('a settled record shows no state texts and no greyed-out action', () => {
		const w = mountTile({ id: 'c1', deadline: daysFromToday(-3), closed: true }, { ...TERM, settledField: 'closed' })
		expect(w.find('.cn-countdown-widget__value').text()).toBe('Closed')
		expect(w.find('[data-testid="cn-countdown-notice"]').exists()).toBe(false)
		expect(buttons(w).every((b) => !b.disabled)).toBe(true)
	})
})

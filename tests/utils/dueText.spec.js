/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The due text and its tone, through the real @nextcloud/l10n and the catalogue.
 *
 * @spec openspec/changes/screens-due-text/specs/due-text/spec.md
 */
const { mount } = require('@vue/test-utils')
const { registerTranslations } = require('../../src/l10n/index.js')
const { resolveDue } = require('../../src/utils/dueText.js')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

const NOW = new Date(2026, 9, 12, 15, 0, 0)
const day = (offset) => new Date(2026, 9, 12 + offset, 9, 0, 0)

function setLanguage(language) {
	globalThis._nc_l10n_language = language
	globalThis._nc_l10n_locale = language
	registerTranslations()
}

afterAll(() => setLanguage('en'))

describe('resolveDue', () => {
	beforeEach(() => setLanguage('nl'))

	it('marks today and a date within soonWithin days as soon, and nothing else', () => {
		const cfg = { soonWithin: 7 }
		expect(resolveDue(day(0), cfg, (x) => x, NOW).soon).toBe(true)
		expect(resolveDue(day(3), cfg, (x) => x, NOW).soon).toBe(true)
		expect(resolveDue(day(7), cfg, (x) => x, NOW).soon).toBe(true)
		expect(resolveDue(day(10), cfg, (x) => x, NOW).soon).toBeUndefined()
		expect(resolveDue(day(-2), cfg, (x) => x, NOW)).toMatchObject({ tone: 'danger' })
		expect(resolveDue(day(-2), cfg, (x) => x, NOW).soon).toBeUndefined()
		expect(resolveDue(day(3), {}, (x) => x, NOW).soon).toBeUndefined()
	})

	it('draws a soon date in the warning colour in a table cell', () => {
		const soon = new Date(Date.now() + 3 * 86400000).toISOString()
		const w = mount(CnCellRenderer, { propsData: { value: soon, widget: 'date', widgetProps: { due: { soonWithin: 7 } } }, stubs: { NcDateTime: true } })
		expect(w.find('[data-testid="cn-cell-renderer-due"]').classes()).toContain('cn-cell-renderer__date--warning')
	})

	it('follows variantWhen rules on a due date when they match', () => {
		const soon = new Date(Date.now() + 3 * 86400000).toISOString()
		const rules = [{ op: 'lt', value: 0, variant: 'error' }, { op: 'lte', value: 7, variant: 'warning' }]
		const w = mount(CnCellRenderer, { propsData: { value: soon, widget: 'date', widgetProps: { due: {}, variantWhen: rules } }, stubs: { NcDateTime: true } })
		expect(w.find('[data-testid="cn-cell-renderer-due"]').classes()).toContain('cn-cell-renderer__date--warning')
	})

	it('reads days overdue in the danger tone', () => {
		expect(resolveDue(day(-3), {}, (x) => x, NOW)).toEqual({ text: '3 dagen te laat', tone: 'danger' })
		expect(resolveDue(day(-1), {}, (x) => x, NOW)).toEqual({ text: '1 dag te laat', tone: 'danger' })
	})

	it('reads today, then the date for a day still to come', () => {
		expect(resolveDue(day(0), {}, (x) => x, NOW)).toEqual({ text: 'Vandaag', tone: 'today' })
		expect(resolveDue(day(1), {}, (x) => x, NOW)).toEqual({ text: 'morgen', tone: 'upcoming' })
		expect(resolveDue(day(9), {}, (x) => x, NOW)).toEqual({ text: '21 okt', tone: 'upcoming' })
	})

	it('reads the configured text for an empty field, and nothing without one', () => {
		expect(resolveDue(null, { emptyText: 'Geen deadline' }, (x) => x, NOW)).toEqual({ text: 'Geen deadline', tone: 'empty' })
		expect(resolveDue('', {}, (x) => x, NOW)).toBeNull()
	})

	it('takes configured labels through translate', () => {
		const cfg = { todayLabel: 'Today!', overdueLabel: { one: '{count} day late', other: '{count} days late' } }
		const tr = (x) => ({ 'Today!': 'Nu!', '{count} days late': '{count} dagen laat' }[x] || x)
		expect(resolveDue(day(0), cfg, tr, NOW).text).toBe('Nu!')
		expect(resolveDue(day(-2), cfg, tr, NOW).text).toBe('2 dagen laat')
	})
})

describe('resolveDue upcomingLabel', () => {
	beforeEach(() => setLanguage('nl'))
	const cfg = {
		upcomingLabel: { one: 'nog {count} dag', other: 'nog {count} dagen' },
		upcomingWeeksLabel: { one: 'nog {count} week', other: 'nog {count} weken' },
	}

	it('reads the days left for a day to come', () => {
		expect(resolveDue(day(1), cfg, (x) => x, NOW)).toEqual({ text: 'nog 1 dag', tone: 'upcoming' })
		expect(resolveDue(day(4), cfg, (x) => x, NOW)).toEqual({ text: 'nog 4 dagen', tone: 'upcoming' })
		expect(resolveDue(day(28), cfg, (x) => x, NOW)).toEqual({ text: 'nog 28 dagen', tone: 'upcoming' })
	})

	it('reads the weeks left from upcomingWeeksFrom days, default 35', () => {
		expect(resolveDue(day(56), cfg, (x) => x, NOW).text).toBe('nog 8 weken')
		expect(resolveDue(day(35), cfg, (x) => x, NOW).text).toBe('nog 5 weken')
		expect(resolveDue(day(14), { ...cfg, upcomingWeeksFrom: 7 }, (x) => x, NOW).text).toBe('nog 2 weken')
	})

	it('keeps days without upcomingWeeksLabel, and the date without upcomingLabel', () => {
		expect(resolveDue(day(56), { upcomingLabel: cfg.upcomingLabel }, (x) => x, NOW).text).toBe('nog 56 dagen')
		expect(resolveDue(day(9), {}, (x) => x, NOW).text).toBe('21 okt')
	})

	it('leaves today and overdue alone', () => {
		expect(resolveDue(day(0), cfg, (x) => x, NOW).tone).toBe('today')
		expect(resolveDue(day(-2), cfg, (x) => x, NOW)).toEqual({ text: '2 dagen te laat', tone: 'danger' })
	})
})

describe('CnCellRenderer date widget with due', () => {
	beforeEach(() => setLanguage('nl'))
	const stubs = { NcDateTime: true }
	const mountCell = (value) => mount(CnCellRenderer, { propsData: { value, widget: 'date', widgetProps: { due: { emptyText: 'Geen deadline' } } }, stubs })

	it('tones an overdue date red', () => {
		const past = new Date(Date.now() - 3 * 86400000).toISOString()
		const cell = mountCell(past).find('[data-testid="cn-cell-renderer-due"]')
		expect(cell.text()).toMatch(/^[34] dagen te laat$/)
		expect(cell.classes()).toContain('cn-cell-renderer__date--error')
	})

	it('reads the empty text when the field is empty', () => {
		expect(mountCell(null).find('[data-testid="cn-cell-renderer-due"]').text()).toBe('Geen deadline')
	})
})

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

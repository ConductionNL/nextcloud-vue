/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The deadline column of board DqTaken: "2 dagen te laat" and "Vandaag" in red,
 * "Morgen" and "Vrijdag 9 okt" in orange, "14 okt" plain, and a finished task's
 * deadline as "Klaar op 6 okt" in grey.
 *
 * @spec openspec/changes/due-text-today-near-done/specs/due-text/spec.md
 */
const { mount } = require('@vue/test-utils')
const { registerTranslations } = require('../../src/l10n/index.js')
const { resolveDue } = require('../../src/utils/dueText.js')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

const NOW = new Date(2026, 9, 12, 15, 0, 0)
const day = (offset) => new Date(2026, 9, 12 + offset, 9, 0, 0)
const same = (text) => text

const BOARD = {
	todayTone: 'danger',
	nearWithin: 6,
	soonWithin: 2,
	activeWhen: { field: 'isTerminal', equals: false },
	inactiveLabel: 'Done on {date}',
}

function setLanguage(language) {
	globalThis._nc_l10n_language = language
	globalThis._nc_l10n_locale = language
	registerTranslations()
}

afterAll(() => setLanguage('en'))

describe('resolveDue: the board deadline tones', () => {
	beforeEach(() => setLanguage('nl'))

	it('reads today in the danger tone with todayTone', () => {
		expect(resolveDue(day(0), BOARD, same, NOW, { isTerminal: false })).toMatchObject({ tone: 'danger' })
		expect(resolveDue(day(0), {}, same, NOW).tone).toBe('today')
	})

	it('reads tomorrow and the days of the coming week by name within nearWithin', () => {
		expect(resolveDue(day(1), BOARD, same, NOW, { isTerminal: false })).toMatchObject({ text: 'Morgen', soon: true })
		expect(resolveDue(day(2), BOARD, same, NOW, { isTerminal: false })).toMatchObject({ text: 'Woensdag 14 okt', soon: true })
		expect(resolveDue(day(6), BOARD, same, NOW, { isTerminal: false }).text).toBe('Zondag 18 okt')
		expect(resolveDue(day(6), BOARD, same, NOW, { isTerminal: false }).soon).toBeUndefined()
		expect(resolveDue(day(7), BOARD, same, NOW, { isTerminal: false }).text).toBe('19 okt')
	})

	it('reads a finished row with inactiveLabel in the muted tone', () => {
		expect(resolveDue(day(-6), BOARD, same, NOW, { isTerminal: true })).toEqual({ text: 'Done on 6 okt', tone: 'muted' })
	})

	it('keeps the old wording without the new options', () => {
		expect(resolveDue(day(2), {}, same, NOW).text).toBe(resolveDue(day(2), { soonWithin: 2 }, same, NOW).text)
		expect(resolveDue(day(-6), { activeWhen: BOARD.activeWhen }, same, NOW, { isTerminal: true })).toEqual({ text: '6 okt', tone: 'plain' })
	})

	it('draws today in the error colour and a finished deadline muted in a cell', () => {
		const today = mount(CnCellRenderer, { propsData: { value: new Date().toISOString(), widget: 'date', widgetProps: { due: BOARD }, row: { isTerminal: false } } })
		expect(today.find('[data-testid="cn-cell-renderer-due"]').classes()).toContain('cn-cell-renderer__date--error')
		const done = mount(CnCellRenderer, { propsData: { value: new Date().toISOString(), widget: 'date', widgetProps: { due: BOARD }, row: { isTerminal: true } } })
		expect(done.find('[data-testid="cn-cell-renderer-due"]').classes()).toContain('cn-cell-renderer__date--muted')
	})
})

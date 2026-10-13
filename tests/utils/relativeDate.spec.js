/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The relative date ("vandaag, 09.42", "gisteren", then the short date) in the
 * helper, the record-list template tokens, the built-in formatter and the
 * `date` cell widget. Runs through the real @nextcloud/l10n and the library's
 * catalogue.
 *
 * @spec openspec/changes/screens-relative-dates/specs/relative-dates/spec.md
 */
const { mount } = require('@vue/test-utils')
const { registerTranslations } = require('../../src/l10n/index.js')
const { formatRelativeDate } = require('../../src/utils/boardDate.js')
const { BUILT_IN_FORMATTERS } = require('../../src/utils/builtInFormatters.js')
const { fillTemplate } = require('../../src/utils/fillTemplate.js')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

const NOW = new Date(2026, 9, 12, 15, 0, 0)
const at = (day, h, m) => new Date(2026, 9, day, h, m, 0)

function setLanguage(language) {
	globalThis._nc_l10n_language = language
	globalThis._nc_l10n_locale = language
	registerTranslations()
}

afterAll(() => setLanguage('en'))

describe('formatRelativeDate', () => {
	beforeEach(() => setLanguage('nl'))

	it('reads today and yesterday as words, with the time when asked', () => {
		expect(formatRelativeDate(at(12, 9, 42), { now: NOW, withTime: true })).toBe('vandaag, 09.42')
		expect(formatRelativeDate(at(11, 23, 12), { now: NOW, withTime: true })).toBe('gisteren, 23.12')
		expect(formatRelativeDate(at(12, 9, 42), { now: NOW })).toBe('vandaag')
		expect(formatRelativeDate(at(11, 23, 12), { now: NOW })).toBe('gisteren')
	})

	it('reads the short date from the day before yesterday, and tomorrow as a word', () => {
		expect(formatRelativeDate(at(8, 8, 5), { now: NOW })).toBe('8 okt')
		expect(formatRelativeDate(at(8, 8, 5), { now: NOW, withTime: true })).toBe('8 okt, 08.05')
		expect(formatRelativeDate(new Date(2025, 1, 14, 9, 0), { now: NOW })).toBe('14 feb 2025')
		expect(formatRelativeDate(at(13, 9, 0), { now: NOW })).toBe('morgen')
	})

	it('reads English for an English reader', () => {
		setLanguage('en')
		expect(formatRelativeDate(at(12, 9, 42), { now: NOW, withTime: true })).toBe('today, 09:42')
		expect(formatRelativeDate(at(11, 9, 42), { now: NOW })).toBe('yesterday')
	})

	it('returns empty text for an empty or unparseable value', () => {
		expect(formatRelativeDate('', { now: NOW })).toBe('')
		expect(formatRelativeDate(null, { now: NOW })).toBe('')
		expect(formatRelativeDate('not a date', { now: NOW })).toBe('')
	})
})

describe('the template tokens', () => {
	beforeEach(() => setLanguage('nl'))

	it('fills {path|relative} and {path|relativetime}', () => {
		const row = { app: 'dossiq', at: at(12, 9, 42).toISOString() }
		expect(fillTemplate('{app} · {at|relative}', row, NOW)).toBe('dossiq · vandaag')
		expect(fillTemplate('{app} · {at|relativetime}', row, NOW)).toBe('dossiq · vandaag, 09.42')
	})

	it('empties the whole template for a missing date', () => {
		expect(fillTemplate('{app} · {at|relativetime}', { app: 'dossiq' }, NOW)).toBe('')
	})
})

describe('the relativeDate formatter', () => {
	beforeEach(() => setLanguage('nl'))

	it('is registered, and adds the time on formatterOptions.time', () => {
		const format = BUILT_IN_FORMATTERS.relativeDate
		const today = new Date()
		today.setHours(9, 42, 0, 0)
		expect(format(today)).toBe('vandaag')
		expect(format(today, {}, {}, { time: true })).toBe('vandaag, 09.42')
	})

	it('is safe on empty and unparseable input', () => {
		const format = BUILT_IN_FORMATTERS.relativeDate
		expect(format(null)).toBe('')
		expect(format('')).toBe('')
		expect(format('soon')).toBe('soon')
	})
})

describe('CnCellRenderer date widget', () => {
	beforeEach(() => setLanguage('nl'))

	const stubs = { NcDateTime: { props: ['timestamp'], template: '<span />' } }

	it('reads relatively with widgetProps.relative and carries the full date as the tooltip', () => {
		const today = new Date()
		today.setHours(9, 42, 0, 0)
		const time = mount(CnCellRenderer, { propsData: { value: today.toISOString(), widget: 'date', widgetProps: { relative: true, showTime: true } }, stubs }).find('time')
		expect(time.text()).toBe('vandaag, 09.42')
		expect(time.attributes('title')).not.toBe(today.toISOString())
	})

	it('renders as before without relative', () => {
		const today = new Date()
		today.setHours(9, 42, 0, 0)
		const time = mount(CnCellRenderer, { propsData: { value: today.toISOString(), widget: 'date' }, stubs }).find('time')
		expect(time.text()).not.toContain('vandaag')
	})
})

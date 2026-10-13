/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The date tile cell (`widget: "date"`, `widgetProps.layout: "block"`): the
 * day number over the short month, beside the weekday and the time range to a
 * second field (screens-date-tile-cell).
 *
 * @spec openspec/changes/screens-date-tile-cell/specs/data-table/spec.md
 */
const { mount } = require('@vue/test-utils')
const { registerTranslations } = require('../../src/l10n/index.js')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

function setLanguage(language) {
	globalThis._nc_l10n_language = language
	globalThis._nc_l10n_locale = language
	registerTranslations()
}

afterAll(() => setLanguage('en'))

const ROW = { scheduledDate: '2026-10-06T09:30:00', endDate: '2026-10-06T12:00:00' }

function mountCell({ value = ROW.scheduledDate, row = ROW, widgetProps = { layout: 'block', endField: 'endDate' }, property = { type: 'string', format: 'date-time' } } = {}) {
	return mount(CnCellRenderer, { propsData: { value, row, widget: 'date', widgetProps, property } })
}

const text = (wrapper, part) => wrapper.find('.cn-cell-renderer__date-' + part).text()

describe('date tile cell', () => {
	it('reads the board line in Dutch: 6 okt, dinsdag, 09.30 tot 12.00 uur', () => {
		setLanguage('nl')
		const wrapper = mountCell()
		expect(wrapper.find('[data-testid="cn-cell-date-block"]').exists()).toBe(true)
		expect(text(wrapper, 'day')).toBe('6')
		expect(text(wrapper, 'month')).toBe('okt')
		expect(text(wrapper, 'weekday')).toBe('dinsdag')
		expect(text(wrapper, 'time')).toBe('09.30 tot 12.00 uur')
	})

	it('reads English for an English reader', () => {
		setLanguage('en')
		const wrapper = mountCell()
		expect(text(wrapper, 'month')).toBe('Oct')
		expect(text(wrapper, 'weekday')).toBe('Tuesday')
		expect(text(wrapper, 'time')).toBe('09:30 to 12:00')
	})

	it('shows the start time alone without an end, and no time line for a bare date', () => {
		setLanguage('nl')
		const noEnd = mountCell({ row: { scheduledDate: ROW.scheduledDate } })
		expect(text(noEnd, 'time')).toBe('09.30')
		const bare = mountCell({ value: '2026-10-06', row: { scheduledDate: '2026-10-06' }, property: { type: 'string', format: 'date' } })
		expect(bare.find('.cn-cell-renderer__date-time').exists()).toBe(false)
		expect(text(bare, 'weekday')).toBe('dinsdag')
	})

	it('keeps the one-line date without the layout, and a dash for no date', () => {
		setLanguage('en')
		const plain = mountCell({ widgetProps: {} })
		expect(plain.find('[data-testid="cn-cell-date-block"]').exists()).toBe(false)
		expect(plain.find('.cn-cell-renderer__date').exists()).toBe(true)
		const empty = mountCell({ value: null })
		expect(empty.find('.cn-cell-renderer__dash').exists()).toBe(true)
	})
})

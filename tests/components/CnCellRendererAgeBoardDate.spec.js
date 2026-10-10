/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnCellRenderer: the built-in `age` widget ("Wachtend" on PqTickets) and the
 * board's short date ("5 okt") under the board look. Without the look a date
 * cell renders exactly as before.
 *
 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md
 */
const { mount } = require('@vue/test-utils')
const { registerTranslations } = require('../../src/l10n/index.js')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

const HOUR = 3600000
const DAY = 24 * HOUR
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const thisYear = new Date().getFullYear()
const localIso = (y, m, d) => [y, String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('-')

const LATE = [{ op: 'gte', value: 3, variant: 'error' }]
const stubs = { NcDateTime: { props: ['timestamp'], template: '<span class="nc-date-time-stub" />' } }
function mountCell(propsData, look) {
	return mount(CnCellRenderer, {
		propsData,
		provide: look ? { cnLook: look } : {},
		stubs,
	})
}

beforeAll(() => {
	globalThis._nc_l10n_language = 'nl'
	globalThis._nc_l10n_locale = 'en_US'
	registerTranslations()
})

afterAll(() => {
	globalThis._nc_l10n_language = 'en'
	globalThis._nc_l10n_locale = 'en'
	registerTranslations()
})

describe('CnCellRenderer age widget', () => {
	it('reads hours under a day and calendar days after that', () => {
		expect(mountCell({ value: ago(4 * HOUR + 60000), widget: 'age' }).find('time.cn-cell-renderer__age').text()).toBe('4 uur')
		expect(mountCell({ value: ago(3 * DAY + HOUR), widget: 'age' }).find('time').text()).toMatch(/^[34] dagen$/)
	})

	it('turns red past the threshold and stays plain under it', () => {
		const late = mountCell({ value: ago(4 * DAY), widget: 'age', widgetProps: { variantWhen: LATE } }).find('time')
		expect(late.classes()).toContain('cn-cell-renderer__age--error')
		const fresh = mountCell({ value: ago(5 * HOUR), widget: 'age', widgetProps: { variantWhen: LATE } }).find('time')
		expect(fresh.classes()).not.toContain('cn-cell-renderer__age--error')
	})

	it('carries the moment as datetime and the full date as the tooltip', () => {
		const value = ago(2 * DAY)
		const time = mountCell({ value, widget: 'age' }).find('time')
		expect(time.attributes('datetime')).toBe(new Date(value).toISOString())
		expect(time.attributes('title')).toBeTruthy()
	})

	it('shows a dash for no date', () => {
		const wrapper = mountCell({ value: null, widget: 'age' })
		expect(wrapper.find('time').exists()).toBe(false)
		expect(wrapper.find('.cn-cell-renderer__dash').exists()).toBe(true)
	})
})

describe('CnCellRenderer date under the board look', () => {
	const property = { type: 'string', format: 'date' }

	it('renders a schema date in the short form in the user language, not the relative NcDateTime', () => {
		const wrapper = mountCell({ value: localIso(thisYear, 10, 5), property }, 'board')
		expect(wrapper.find('.nc-date-time-stub').exists()).toBe(false)
		expect(wrapper.find('time.cn-cell-renderer__date').text()).toBe('5 okt')
	})

	it('adds the year outside the current year', () => {
		expect(mountCell({ value: '2024-02-14', property }, 'board').find('time').text()).toBe('14 feb 2024')
	})

	it('writes the date widget in the short form, and keeps the full form with a time', () => {
		expect(mountCell({ value: localIso(thisYear, 10, 30), widget: 'date' }, 'board').find('time').text()).toBe('30 okt')
		expect(mountCell({ value: localIso(thisYear, 10, 30), widget: 'date', widgetProps: { showTime: true } }, 'board').find('time').text()).not.toBe('30 okt')
	})

	it('renders exactly as before without the look', () => {
		expect(mountCell({ value: '2024-02-14', property }).find('.nc-date-time-stub').exists()).toBe(true)
		expect(mountCell({ value: '2024-02-14', property }, 'nextcloud').find('.nc-date-time-stub').exists()).toBe(true)
		const plain = mountCell({ value: '2024-02-14', widget: 'date' }).find('time').text()
		expect(plain).toContain('2024')
		expect(plain).not.toBe('14 feb 2024')
	})
})

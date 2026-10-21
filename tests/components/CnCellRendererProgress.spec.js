/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnCellRenderer: the built-in `progress` widget (abstract-progress-cell),
 * PqLeads' Winkans column as configuration: a bar with its percentage, toned
 * by thresholds, with fallback fields and an age badge.
 *
 * @spec openspec/changes/abstract-progress-cell/specs/progress-cell/spec.md
 */
const { mount } = require('@vue/test-utils')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

const DAY = 24 * 3600000
const NOW = Date.UTC(2026, 5, 15, 12)
const ago = (days) => new Date(NOW - days * DAY - 3600000).toISOString()

// The age counts local calendar days, so the clock stands still at midday:
// near midnight "6 days and an hour ago" would fall on another day.
beforeAll(() => {
	jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] })
	jest.setSystemTime(NOW)
})

afterAll(() => {
	jest.useRealTimers()
})

/**
 * Mount a progress cell.
 *
 * @param {object} props The cell props.
 * @return {object} The wrapper.
 */
function cell(props) {
	return mount(CnCellRenderer, {
		props: { widget: 'progress', ...props },
		global: { provide: { cnTranslate: (key) => `T(${key})` } },
	})
}

describe('CnCellRenderer progress widget', () => {
	it('draws the bar at the percentage, with the number beside it', () => {
		const w = cell({ value: 62 })
		expect(w.find('.cn-cell-renderer__progress-fill').attributes('style')).toContain('width: 62%')
		expect(w.find('.cn-cell-renderer__progress-value').text()).toBe('62%')
	})

	it('tones by the default thresholds: 60 and up success, 30 and up warning, below error', () => {
		expect(cell({ value: 60 }).find('.cn-cell-renderer__progress-fill--success').exists()).toBe(true)
		expect(cell({ value: 41 }).find('.cn-cell-renderer__progress-value--warning').exists()).toBe(true)
		expect(cell({ value: 22 }).find('.cn-cell-renderer__progress-fill--error').exists()).toBe(true)
	})

	it('takes custom thresholds and a turned scale', () => {
		expect(cell({ value: 50, widgetProps: { thresholds: { good: 50, warn: 20 } } }).find('.cn-cell-renderer__progress-fill--success').exists()).toBe(true)
		expect(cell({ value: 90, widgetProps: { lowerIsBetter: true } }).find('.cn-cell-renderer__progress-fill--error').exists()).toBe(true)
	})

	it('scales to max and clamps to 0..100', () => {
		expect(cell({ value: 3, widgetProps: { max: 4 } }).find('.cn-cell-renderer__progress-value').text()).toBe('75%')
		expect(cell({ value: 140 }).find('.cn-cell-renderer__progress-value').text()).toBe('100%')
		expect(cell({ value: -5 }).find('.cn-cell-renderer__progress-value').text()).toBe('0%')
	})

	it('falls back to row fields when the value is empty, and shows a dash when none holds a number', () => {
		const w = cell({ value: null, row: { probability: '', qualificationScore: 48 }, widgetProps: { fallbackFields: ['probability', 'qualificationScore'] } })
		expect(w.find('.cn-cell-renderer__progress-value').text()).toBe('48%')
		expect(cell({ value: null, row: {} }).find('.cn-cell-renderer__dash').exists()).toBe(true)
	})

	it('shows the age badge past afterDays, translated with {days}', () => {
		const badge = { label: 'Out of date {days} days', dateField: '@self.updated', afterDays: 14, when: { status: 'open' } }
		const w = cell({ value: 22, row: { status: 'open', '@self': { updated: ago(24) } }, widgetProps: { badge } })
		expect(w.find('.cn-cell-renderer__progress-badge').text()).toBe('T(Out of date 24 days)')
		expect(w.find('.cn-cell-renderer__progress-badge--error').exists()).toBe(true)
	})

	it('shows no badge under afterDays, or when a when field differs', () => {
		const badge = { label: 'Out of date {days} days', afterDays: 14, when: { status: 'open' } }
		expect(cell({ value: 22, row: { status: 'open', '@self': { updated: ago(3) } }, widgetProps: { badge } }).find('.cn-cell-renderer__progress-badge').exists()).toBe(false)
		expect(cell({ value: 22, row: { status: 'won', '@self': { updated: ago(30) } }, widgetProps: { badge } }).find('.cn-cell-renderer__progress-badge').exists()).toBe(false)
	})
})

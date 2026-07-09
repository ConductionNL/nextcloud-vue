/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnCellRenderer's declarative `format` prop — the no-code
 * alternative to a registry formatter:
 *  - currency / number / percent / duration numeric styles
 *  - the colour swatch (`style:"swatch"`) reading a sibling row colour field
 *  - precedence: `formatter` / `widget` win over `format`, `format` wins over
 *    the type-aware default.
 */

import { mount } from '@vue/test-utils'

const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

/**
 * Mount helper.
 *
 * @param {object} propsData Component props.
 * @param {object} [provide] Provide map.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountRenderer(propsData, provide) {
	return mount(CnCellRenderer, {
		propsData,
		...(provide !== undefined ? { provide } : {}),
	})
}

describe('CnCellRenderer — declarative format', () => {
	describe('currency', () => {
		it('formats a number as EUR currency with a euro sign and 2 decimals by default', () => {
			const wrapper = mountRenderer({
				value: 1234.56,
				property: { type: 'number' },
				format: { style: 'currency', currency: 'EUR' },
			})
			const text = wrapper.text()
			expect(text).toContain('€')
			// Locale-agnostic: the integer + 2-decimal digits are present.
			expect(text.replace(/[^\d]/g, '')).toBe('123456')
		})

		it('honours an explicit decimals override', () => {
			const wrapper = mountRenderer({
				value: 1000,
				property: { type: 'number' },
				format: { style: 'currency', currency: 'EUR', decimals: 0 },
			})
			expect(wrapper.text().replace(/[^\d]/g, '')).toBe('1000')
		})

		it('renders an em-dash for an empty value', () => {
			const wrapper = mountRenderer({
				value: null,
				property: { type: 'number' },
				format: { style: 'currency' },
			})
			expect(wrapper.text()).toBe('—')
		})

		it('falls back to plain text for a non-numeric value', () => {
			const wrapper = mountRenderer({
				value: 'n/a',
				property: { type: 'string' },
				format: { style: 'currency' },
			})
			expect(wrapper.text()).toBe('n/a')
		})
	})

	describe('percent and number', () => {
		it('appends a percent sign for style:"percent"', () => {
			const wrapper = mountRenderer({
				value: 83.3,
				property: { type: 'number' },
				format: { style: 'percent', decimals: 1 },
			})
			expect(wrapper.text()).toContain('%')
			expect(wrapper.text().replace(/[^\d]/g, '')).toBe('833')
		})

		it('applies prefix and suffix to style:"number"', () => {
			const wrapper = mountRenderer({
				value: 42,
				property: { type: 'integer' },
				format: { style: 'number', prefix: '~', suffix: ' pts' },
			})
			expect(wrapper.text()).toBe('~42 pts')
		})
	})

	describe('duration', () => {
		it('renders seconds compactly (hours + minutes)', () => {
			const wrapper = mountRenderer({
				value: 3 * 3600 + 25 * 60 + 10,
				property: { type: 'integer' },
				format: { style: 'duration' },
			})
			expect(wrapper.text()).toBe('3u 25m')
		})

		it('renders sub-minute durations in seconds', () => {
			const wrapper = mountRenderer({
				value: 45,
				property: { type: 'integer' },
				format: { style: 'duration' },
			})
			expect(wrapper.text()).toBe('45s')
		})

		it('accepts a minutes input unit', () => {
			const wrapper = mountRenderer({
				value: 90,
				property: { type: 'integer' },
				format: { style: 'duration', unit: 'minutes' },
			})
			expect(wrapper.text()).toBe('1u 30m')
		})
	})

	describe('swatch', () => {
		it('renders a colour dot from the default "color" sibling field plus the cell text', () => {
			const wrapper = mountRenderer({
				value: 'Hardware',
				property: { type: 'string' },
				format: { style: 'swatch' },
				row: { name: 'Hardware', color: '#ff8800' },
			})
			const dot = wrapper.find('.cn-cell-renderer__swatch-dot')
			expect(dot.exists()).toBe(true)
			expect(dot.attributes('style')).toContain('background-color')
			expect(dot.attributes('style')).toContain('rgb(255, 136, 0)')
			expect(wrapper.text()).toContain('Hardware')
		})

		it('reads the colour from a custom colorField', () => {
			const wrapper = mountRenderer({
				value: 'Travel',
				property: { type: 'string' },
				format: { style: 'swatch', colorField: 'hex' },
				row: { hex: '#0082c9' },
			})
			const dot = wrapper.find('.cn-cell-renderer__swatch-dot')
			expect(dot.exists()).toBe(true)
		})

		it('omits the dot when the colour field is empty', () => {
			const wrapper = mountRenderer({
				value: 'Misc',
				property: { type: 'string' },
				format: { style: 'swatch' },
				row: { color: '' },
			})
			expect(wrapper.find('.cn-cell-renderer__swatch-dot').exists()).toBe(false)
			expect(wrapper.text()).toContain('Misc')
		})
	})

	describe('precedence', () => {
		it('lets a registry formatter win over a format spec', () => {
			const wrapper = mountRenderer(
				{
					value: 1000,
					property: { type: 'number' },
					format: { style: 'currency' },
					formatter: 'custom',
				},
				{ cnFormatters: { custom: () => 'CUSTOM' } },
			)
			expect(wrapper.text()).toBe('CUSTOM')
		})
	})
})

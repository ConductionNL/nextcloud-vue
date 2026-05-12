/**
 * Tests for CnCellRenderer's column-formatter resolution.
 *
 * A column's `formatter` id resolves against the injected `cnFormatters`
 * registry (provided by CnAppRoot). When resolvable, the cell renders
 * `cnFormatters[formatter](value, row, property)` as text — overriding the
 * type-aware rendering. Unknown ids, a missing registry, and throwing
 * formatters all fall back to the existing `formatValue()` behaviour.
 */

import { mount } from '@vue/test-utils'

const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

/**
 * Mount helper.
 *
 * @param {object} propsData Component props.
 * @param {object} cnFormatters The formatter registry to provide (omit for none).
 * @return {object} The Vue Test Utils wrapper.
 */
function mountRenderer(propsData, cnFormatters) {
	return mount(CnCellRenderer, {
		propsData,
		...(cnFormatters !== undefined ? { provide: { cnFormatters } } : {}),
	})
}

describe('CnCellRenderer — column formatters', () => {
	it('renders a registered formatter with (value, row, property)', () => {
		const seen = []
		const wrapper = mountRenderer(
			{
				value: 'lead.created',
				property: { type: 'string' },
				formatter: 'humanTrigger',
				row: { trigger: 'lead.created', name: 'Welcome flow' },
			},
			{
				humanTrigger: (value, row, property) => {
					seen.push({ value, row, property })
					return 'Lead created'
				},
			},
		)
		expect(wrapper.text()).toBe('Lead created')
		expect(seen).toHaveLength(1)
		expect(seen[0].value).toBe('lead.created')
		expect(seen[0].row).toEqual({ trigger: 'lead.created', name: 'Welcome flow' })
		expect(seen[0].property).toEqual({ type: 'string' })
	})

	it('falls back to type-aware rendering when the formatter id is unknown', () => {
		const wrapper = mountRenderer(
			{ value: 'plain text', property: { type: 'string' }, formatter: 'nope' },
			{ humanTrigger: () => 'unreachable' },
		)
		expect(wrapper.text()).toBe('plain text')
	})

	it('falls back when no cnFormatters registry is provided', () => {
		const wrapper = mountRenderer({ value: 'plain text', property: { type: 'string' }, formatter: 'humanTrigger' })
		expect(wrapper.text()).toBe('plain text')
	})

	it('renders unchanged when no formatter is set (regression)', () => {
		const wrapper = mountRenderer({ value: 42, property: { type: 'integer' } }, { humanTrigger: () => 'x' })
		expect(wrapper.text()).toBe('42')
	})

	it('falls back and warns when the formatter throws', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountRenderer(
			{ value: 'plain text', property: { type: 'string' }, formatter: 'boom' },
			{ boom: () => { throw new Error('kaboom') } },
		)
		expect(wrapper.text()).toBe('plain text')
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})
})

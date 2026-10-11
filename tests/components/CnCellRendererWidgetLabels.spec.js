/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column with `widget: "badge"` printed the stored enum code ("active")
 * while the same property without a widget, and every detail page, printed
 * its `x-enum-labels` label ("Active"). The built-in widgets now resolve the
 * label the way the plain enum cell does, translated.
 *
 * Three things this file holds on to, each of which a "does it say Active?"
 * assertion alone would miss:
 *  - the badge colour stays keyed on the RAW value, so translating the label
 *    does not turn every badge grey;
 *  - an app that passes its own formatter (pipelinq's `enumLabel`, `yesNo`)
 *    gets exactly what its formatter returns, translated once, not twice;
 *  - a colour map keyed on a formatter's output keeps working.
 *
 * @spec openspec/changes/cell-labels-and-draft-indicator/specs/cell-labels-and-draft-indicator/spec.md#requirement-a-built-in-cell-widget-shows-an-enum-value-by-its-label
 */

import { mount } from '@vue/test-utils'
import CnCellRenderer from '@/components/CnCellRenderer/CnCellRenderer.vue'

const property = {
	type: 'string',
	title: 'Status',
	enum: ['active', 'inactive'],
	'x-enum-labels': { active: 'Active', inactive: 'Inactive' },
}

const dutch = { Active: 'Actief', Inactive: 'Inactief', active: 'actief-code' }
const cnTranslate = (key) => dutch[key] ?? key

const RouterLinkStub = { props: ['to'], template: '<a class="router-link-stub"><slot /></a>' }

/**
 * Mount one cell.
 *
 * @param {object} props Props for CnCellRenderer.
 * @param {object} [provide] Injections.
 * @return {object} The wrapper.
 */
function cell(props, provide = {}) {
	return mount(CnCellRenderer, {
		props: { property, ...props },
		global: { provide, stubs: { 'router-link': RouterLinkStub } },
	})
}

describe('CnCellRenderer: built-in widgets show an enum value by its label', () => {
	it('the badge shows the x-enum-labels label, not the stored code', () => {
		const wrapper = cell({ value: 'active', widget: 'badge' })

		expect(wrapper.find('.cn-status-badge').text()).toBe('Active')
		wrapper.unmount()
	})

	it('the badge label is translated', () => {
		const wrapper = cell({ value: 'inactive', widget: 'badge' }, { cnTranslate })

		expect(wrapper.find('.cn-status-badge').text()).toBe('Inactief')
		wrapper.unmount()
	})

	it('CONTROL: the plain column (no widget) already read the label, and still does', () => {
		const wrapper = cell({ value: 'active' })

		expect(wrapper.find('.cn-status-badge').text()).toBe('Active')
		wrapper.unmount()
	})

	it('keeps the badge colour keyed on the raw value', () => {
		const wrapper = cell({
			value: 'active',
			widget: 'badge',
			widgetProps: { colorMap: { active: 'success', inactive: 'error' } },
		}, { cnTranslate })

		expect(wrapper.find('.cn-status-badge').text()).toBe('Actief')
		expect(wrapper.find('.cn-status-badge--success').exists()).toBe(true)
		wrapper.unmount()
	})

	it('the link widget shows the label too', () => {
		const wrapper = cell({
			value: 'active',
			widget: 'link',
			widgetProps: { route: 'StatusDetail' },
			row: { id: '1', status: 'active' },
		})

		expect(wrapper.find('.router-link-stub').text()).toBe('Active')
		wrapper.unmount()
	})

	it('a swatch shows the label beside its dot', () => {
		const wrapper = cell({ value: 'active', format: { style: 'swatch' }, row: { color: '#00ff00' } })

		expect(wrapper.text()).toContain('Active')
		expect(wrapper.text()).not.toContain('active')
		wrapper.unmount()
	})

	it('a value with no label shows the code, translated like the plain cell', () => {
		const loose = { type: 'string', enum: ['active', 'other'] }
		const wrapper = cell({ value: 'other', widget: 'badge', property: loose })

		expect(wrapper.find('.cn-status-badge').text()).toBe('other')
		wrapper.unmount()
	})

	it('a non-enum value is untouched', () => {
		const wrapper = cell({ value: 'free text', widget: 'badge', property: { type: 'string' } })

		expect(wrapper.find('.cn-status-badge').text()).toBe('free text')
		wrapper.unmount()
	})
})

describe('CnCellRenderer: an app formatter still wins', () => {
	// pipelinq's src/services/cellFormatters.js, as shipped.
	const enumLabel = (value, _row, prop) => {
		const labels = prop?.['x-enum-labels'] || {}
		return Object.hasOwn(labels, String(value)) ? 'pq:' + labels[String(value)] : String(value)
	}
	const yesNo = (value) => (value === true ? 'Yes' : value === false ? 'No' : '')

	it('a badge with a formatter shows the formatter output, unchanged and not re-translated', () => {
		const wrapper = cell(
			{ value: 'active', widget: 'badge', formatter: 'enumLabel' },
			{ cnFormatters: { enumLabel }, cnTranslate },
		)

		expect(wrapper.find('.cn-status-badge').text()).toBe('pq:Active')
		wrapper.unmount()
	})

	it('a raw-keyed colour map still colours a formatter-labelled badge', () => {
		const wrapper = cell(
			{ value: 'active', widget: 'badge', formatter: 'enumLabel', widgetProps: { colorMap: { active: 'success' } } },
			{ cnFormatters: { enumLabel } },
		)

		expect(wrapper.find('.cn-status-badge--success').exists()).toBe(true)
		wrapper.unmount()
	})

	it('a colour map keyed on the formatter output keeps working', () => {
		const wrapper = cell(
			{ value: 'active', widget: 'badge', formatter: 'enumLabel', widgetProps: { colorMap: { 'pq:Active': 'warning' } } },
			{ cnFormatters: { enumLabel } },
		)

		expect(wrapper.find('.cn-status-badge--warning').exists()).toBe(true)
		wrapper.unmount()
	})

	it('a yesNo formatter on a boolean column prints its words', () => {
		const wrapper = cell(
			{ value: true, formatter: 'yesNo', property: { type: 'boolean' } },
			{ cnFormatters: { yesNo } },
		)

		expect(wrapper.text()).toBe('Yes')
		wrapper.unmount()
	})
})

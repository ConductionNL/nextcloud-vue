/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list column can name a formatter (`formatter: 'timeBlocks'`) that the app
 * registers on CnAppRoot, so a structured value reads as text in the table.
 * The detail page's data widget ignored that registry: the same value, one
 * click further, rendered as a raw table of ISO timestamps (learniq's teacher
 * availability, 2026-10-05). A field override can now name the formatter too,
 * the same id with the same signature as the table cell.
 */

import { mount } from '@vue/test-utils'
import CnObjectDataWidget from '@/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const schema = {
	title: 'Teacher availability',
	properties: {
		teacherName: { type: 'string', title: 'Teacher' },
		blocks: {
			type: 'array',
			title: 'Times',
			items: { type: 'object' },
		},
	},
}

const objectData = {
	teacherName: 'Meester Daan',
	blocks: [
		{ startsAt: '2026-10-22T16:00:00Z', endsAt: '2026-10-22T18:00:00Z' },
	],
}

const stubs = {
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	CnObjectMetadataModal: true,
	NcButton: true,
	NcSelect: true,
	NcTextField: true,
	NcCheckboxRadioSwitch: true,
	NcLoadingIcon: true,
	NcActions: true,
	NcActionButton: true,
}

const blocksText = (value) => value.map((b) => `${b.startsAt.slice(11, 16)}-${b.endsAt.slice(11, 16)}`).join('; ')

function mountWidget({ overrides = {}, provide = {} } = {}) {
	return mount(CnObjectDataWidget, {
		propsData: { schema, objectData, overrides },
		stubs,
		provide,
	})
}

function cell(wrapper, label) {
	return wrapper.findAll('.cn-object-data-widget__cell')
		.filter((c) => c.find('.cn-object-data-widget__label').text() === label)
		.at(0)
		.find('.cn-object-data-widget__value')
}

describe('CnObjectDataWidget: a field override can name a formatter', () => {
	it('renders the value through the registered formatter', () => {
		const wrapper = mountWidget({
			overrides: { blocks: { formatter: 'timeBlocks' } },
			provide: { cnFormatters: { timeBlocks: blocksText } },
		})

		const value = cell(wrapper, 'Times')
		expect(value.text()).toBe('16:00-18:00')
		expect(value.find('table').exists()).toBe(false)
		wrapper.unmount()
	})

	it('hands the formatter the value, the object and the property, like a table cell', () => {
		const formatter = jest.fn(() => 'formatted')
		const wrapper = mountWidget({
			overrides: { blocks: { formatter: 'timeBlocks' } },
			provide: { cnFormatters: { timeBlocks: formatter } },
		})

		expect(formatter).toHaveBeenCalledWith(
			objectData.blocks,
			objectData,
			schema.properties.blocks,
		)
		wrapper.unmount()
	})

	it('keeps the default rendering when the formatter id is not registered', () => {
		const wrapper = mountWidget({
			overrides: { blocks: { formatter: 'unknown' } },
			provide: { cnFormatters: { timeBlocks: blocksText } },
		})

		expect(cell(wrapper, 'Times').find('table').exists()).toBe(true)
		wrapper.unmount()
	})

	it('keeps the default rendering when the formatter throws', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountWidget({
			overrides: { blocks: { formatter: 'timeBlocks' } },
			provide: { cnFormatters: { timeBlocks: () => { throw new Error('boom') } } },
		})

		expect(cell(wrapper, 'Times').find('table').exists()).toBe(true)
		wrapper.unmount()
		warn.mockRestore()
	})

	it('leaves a field without a formatter as before', () => {
		const wrapper = mountWidget({
			overrides: { blocks: { formatter: 'timeBlocks' } },
			provide: { cnFormatters: { timeBlocks: blocksText } },
		})

		expect(cell(wrapper, 'Teacher').text()).toBe('Meester Daan')
		wrapper.unmount()
	})
})

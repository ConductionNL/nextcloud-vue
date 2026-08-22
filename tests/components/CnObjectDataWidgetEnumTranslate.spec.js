/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The detail page's data widget was the last surface still rendering an enum's
 * STORED CODE. Measured in CI: a Timesheet's Status cell read `submitted`
 * while the list beside it already read "Ingediend" — one object, two
 * spellings, because the table cell had learned to translate and this had not.
 *
 * The value written back by inline editing is unaffected: only the displayed
 * string changes.
 */

import { mount } from '@vue/test-utils'

import CnObjectDataWidget from '@/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const schema = {
	title: 'Timesheet',
	properties: {
		period: { type: 'string', title: 'Period' },
		status: {
			type: 'string',
			title: 'Status',
			enum: ['draft', 'submitted'],
			'x-enum-labels': { draft: 'Draft', submitted: 'Submitted' },
		},
	},
}

const objectData = { period: '2026-07', status: 'submitted' }

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

const mountWidget = (provide) => mount(CnObjectDataWidget, {
	propsData: { schema, objectData },
	stubs,
	provide,
})

const cellText = (wrapper, label) => wrapper.findAll('.cn-object-data-widget__cell')
	.filter((c) => c.text().includes(label))
	.at(0)
	.find('.cn-object-data-widget__value')
	.text()

describe('CnObjectDataWidget — enum values render as labels', () => {
	it('shows the declared English label, not the stored code', () => {
		const wrapper = mountWidget()

		expect(cellText(wrapper, 'Status')).toBe('Submitted')
		wrapper.unmount()
	})

	it('shows the translated label in a Dutch session', () => {
		const nl = (key) => ({ Submitted: 'Ingediend', Status: 'Status', Period: 'Periode', Timesheet: 'Urenstaat' })[key] ?? key
		const wrapper = mountWidget({ cnTranslate: nl })

		expect(cellText(wrapper, 'Status')).toBe('Ingediend')
		wrapper.unmount()
	})

	it('leaves a non-enum value formatted as before', () => {
		const wrapper = mountWidget()

		expect(cellText(wrapper, 'Period')).toBe('2026-07')
		wrapper.unmount()
	})

	it('falls through to normal formatting for a value outside the enum', () => {
		// A legacy row holding a code the schema no longer lists must still
		// render, not disappear behind an empty label.
		const wrapper = mount(CnObjectDataWidget, {
			propsData: { schema, objectData: { period: '2026-07', status: 'retired-code' } },
			stubs,
		})

		expect(cellText(wrapper, 'Status')).toBe('retired-code')
		wrapper.unmount()
	})
})

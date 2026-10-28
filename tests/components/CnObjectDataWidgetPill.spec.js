/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * data-widget-value-pill (board PqKassabon "Transactie"): a field override
 * `pill: { variantMap }` draws the field's value as a status pill, its label
 * the shown value (enum label, formatter) and its tone the raw value's entry
 * in `variantMap`. Without the key the value stays text.
 *
 * @spec openspec/changes/data-widget-value-pill/specs/object-data-widget/spec.md#requirement-a-field-can-show-its-value-as-a-pill
 */

import { mount } from '@vue/test-utils'
import CnObjectDataWidget from '@/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const schema = {
	properties: {
		reference: { type: 'string', title: 'Identifier' },
		status: { type: 'string', title: 'Status', enum: ['draft', 'settled'] },
	},
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
	CnStatusBadge: { name: 'CnStatusBadge', props: ['label', 'variant'], template: '<span class="badge-stub">{{ label }}</span>' },
}

/**
 * @param {object} overrides The field overrides.
 * @return {object} The wrapper.
 */
function mountWidget(overrides) {
	return mount(CnObjectDataWidget, {
		propsData: { schema, objectData: { reference: 'POS-1', status: 'settled' }, overrides, editable: false },
		stubs,
	})
}

describe('CnObjectDataWidget: a value as a pill', () => {
	it('draws the value as a pill toned by the raw value', () => {
		const wrapper = mountWidget({ status: { enumLabels: { settled: 'Settled' }, pill: { variantMap: { settled: 'success' } } } })
		const badge = wrapper.findComponent({ name: 'CnStatusBadge' })
		expect(badge.exists()).toBe(true)
		expect(badge.props('label')).toBe('Settled')
		expect(badge.props('variant')).toBe('success')
	})

	it('keeps the value as text without the key', () => {
		const wrapper = mountWidget({})
		expect(wrapper.findComponent({ name: 'CnStatusBadge' }).exists()).toBe(false)
	})
})

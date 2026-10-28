/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A section follows its widget's own `visibleWhen` against the record.
 *
 * @spec openspec/changes/sections-child-visible-when/specs/sections-child-visible-when/spec.md#requirement-a-section-on-a-detail-page-follows-its-widgets-condition
 */
import { mount } from '@vue/test-utils'
import CnSectionsWidget from '../../src/components/CnSectionsWidget/CnSectionsWidget.vue'

const WIDGETS = [
	{ id: 'details', type: 'banner', content: { text: 'A' } },
	{ id: 'request', type: 'banner', visibleWhen: { field: 'parentTicket', op: 'notEmpty' }, content: { text: 'B' } },
]

function keys(objectData) {
	const wrapper = mount(CnSectionsWidget, {
		props: {
			content: { sections: [{ title: 'Details', widgetId: 'details' }, { title: 'Request', widgetId: 'request' }] },
			availableWidgets: WIDGETS,
			objectData,
		},
		global: { stubs: { CnDetailWidgetHost: { props: ['widget'], template: '<p>{{ widget.id }}</p>' } } },
	})
	return wrapper.findAll('section').map((s) => s.attributes('data-testid'))
}

describe('CnSectionsWidget visibleWhen', () => {
	it('drops a section whose condition does not hold for the record', () => {
		expect(keys({ id: '1', parentTicket: null })).toEqual(['cn-section-details'])
	})

	it('keeps a section whose condition holds', () => {
		expect(keys({ id: '1', parentTicket: 'abc' })).toEqual(['cn-section-details', 'cn-section-request'])
	})

	it('keeps every section without a record', () => {
		expect(keys(null)).toEqual(['cn-section-details', 'cn-section-request'])
	})
})

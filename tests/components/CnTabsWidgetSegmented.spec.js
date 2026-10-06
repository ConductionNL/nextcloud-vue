/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.variant: "segmented"` draws the tab strip as a pill switch, the
 * shape the Zuiddrecht case page uses for its parts. The default strip is
 * untouched.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-tabs-widget-renders-a-segmented-strip
 */
import { mount } from '@vue/test-utils'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-request', type: 'object-data', title: 'Request', content: {} },
	{ id: 'w-docs', type: 'object-list', title: 'Documents', content: { register: 'r', schema: 's' } },
]

function mountWidget(content) {
	return mount(CnTabsWidget, {
		props: { content, availableWidgets: WIDGETS, objectId: 'obj-1', register: 'dossiq', schema: 'case' },
		global: {
			stubs: {
				CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host">{{ widget.id }}</div>' },
			},
		},
	})
}

describe('CnTabsWidget — segmented strip', () => {
	it('draws a line strip by default', () => {
		const wrapper = mountWidget({ tabs: [{ widgetId: 'w-request' }, { widgetId: 'w-docs' }] })
		expect(wrapper.find('.cn-tabs').classes()).not.toContain('cn-tabs--segmented')
	})

	it('draws a segmented strip when the content asks for it', () => {
		const wrapper = mountWidget({ variant: 'segmented', tabs: [{ widgetId: 'w-request' }, { widgetId: 'w-docs' }] })
		expect(wrapper.find('.cn-tabs').classes()).toContain('cn-tabs--segmented')
	})

	it('falls back to the line strip for an unknown variant', () => {
		const wrapper = mountWidget({ variant: 'pills', tabs: [{ widgetId: 'w-request' }] })
		expect(wrapper.find('.cn-tabs').classes()).not.toContain('cn-tabs--segmented')
	})
})

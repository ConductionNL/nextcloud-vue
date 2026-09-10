/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `data` widget in a tab panel holds its content directly, with no card of
 * its own around it.
 *
 * It used to keep the whole card, and the reason was real: `CnWidgetWrapper`
 * renders its actions INSIDE the header, `CnObjectDataWidget` puts its Save
 * button there, and hiding the header to remove the duplicate title removed
 * the only way to commit an inline edit. A silently unsaveable form is worse
 * than a doubled title, so the title stayed.
 *
 * Two things had to change together. The wrapper renders its header whenever
 * there are actions, with or without a title, so the two can be asked for
 * separately. And `CnObjectDataWidget` had to be ABLE to be asked: its `title`
 * prop carries a default of "Data", so a host passing `undefined` got the
 * default instead of nothing, which is how a tab panel ended up with a "Data"
 * heading nobody had chosen.
 */

import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

const SCHEMA = {
	title: 'Case',
	properties: {
		title: { type: 'string', title: 'Title' },
	},
}

function mountHost(chrome) {
	return mount(CnDetailWidgetHost, {
		propsData: {
			widget: { id: 'case-core', type: 'data', title: 'Core case data' },
			chrome,
			objectId: 'o1',
			object: { id: 'o1', title: 'A case' },
			objectType: 'case',
			schemaObject: SCHEMA,
			register: 'dossiq',
			schema: 'case',
		},
	})
}

describe('CnDetailWidgetHost — a data widget in a tab panel', () => {
	it('asks the data widget to drop its title, border and padding', () => {
		const data = mountHost('bare').findComponent(CnObjectDataWidget)
		expect(data.exists()).toBe(true)
		expect(data.props('showTitle')).toBe(false)
		expect(data.props('borderless')).toBe(true)
		expect(data.props('flush')).toBe(true)
	})

	it('renders no title row in the panel', () => {
		const wrapper = mountHost('bare')
		// The rendered DOM, not just the props: a component that accepted the
		// props and ignored them would pass a props-only assertion.
		expect(wrapper.find('.cn-widget-wrapper__header-left').exists()).toBe(false)
		expect(wrapper.text()).not.toContain('Data')
	})

	it('keeps the full card on a grid surface', () => {
		const data = mountHost('card').findComponent(CnObjectDataWidget)
		expect(data.props('showTitle')).toBe(true)
		expect(data.props('borderless')).toBe(false)
		expect(data.props('flush')).toBe(false)
	})
})

describe('CnWidgetWrapper — header without a title', () => {
	it('still renders the header when actions need a home', () => {
		const wrapper = mount(CnWidgetWrapper, {
			propsData: { title: 'Data', showTitle: false, showActions: true },
			slots: { actions: '<button data-testid="save">Save</button>' },
		})
		// This is the whole point of splitting the two conditions: no title, and
		// the Save button an inline edit needs is still on screen.
		expect(wrapper.find('[data-testid="save"]').exists()).toBe(true)
		expect(wrapper.find('.cn-widget-wrapper__header').exists()).toBe(true)
		expect(wrapper.find('.cn-widget-wrapper__header-left').exists()).toBe(false)
		expect(wrapper.find('.cn-widget-wrapper__header--actions-only').exists()).toBe(true)
	})

	it('renders no header at all when there is neither a title nor an action', () => {
		const wrapper = mount(CnWidgetWrapper, {
			propsData: { title: 'Data', showTitle: false, showActions: false },
		})
		expect(wrapper.find('.cn-widget-wrapper__header').exists()).toBe(false)
	})

	it('renders the title row normally when asked for one', () => {
		const wrapper = mount(CnWidgetWrapper, {
			propsData: { title: 'Data', showTitle: true },
		})
		expect(wrapper.find('.cn-widget-wrapper__header-left').exists()).toBe(true)
		expect(wrapper.text()).toContain('Data')
	})
})

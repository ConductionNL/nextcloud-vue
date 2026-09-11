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
	it('asks the data widget for no chrome of its own', () => {
		const data = mountHost('bare').findComponent(CnObjectDataWidget)
		expect(data.exists()).toBe(true)
		expect(data.props('chromeless')).toBe(true)
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
		expect(data.props('chromeless')).toBe(false)
		expect(data.props('showTitle')).toBe(true)
		expect(data.props('borderless')).toBe(false)
		expect(data.props('flush')).toBe(false)
	})
})

/**
 * The contract itself, at the wrapper.
 *
 * "No card inside the card" is not "no element inside the card". The wrapper's
 * content node is load-bearing: `CnObjectDataWidget` finds it with `closest()`
 * to measure whether its field grid overflows and to observe resizes, and
 * `src/css/table.css`, `src/css/detail-page.css` and `src/css/dashboard.css`
 * all key layout on it. A `closest()` that finds nothing returns null and the
 * widget concludes that nothing overflows, so deleting the node would remove
 * the whole-row clip and the "Show all N fields" affordance without a single
 * failure anywhere. So `chromeless` suppresses what is DRAWN and keeps what is
 * MEASURED.
 */
describe('CnWidgetWrapper — chromeless', () => {
	it('draws no card: no border, no background, no padding, no title', () => {
		const wrapper = mount(CnWidgetWrapper, {
			propsData: { title: 'Data', chromeless: true },
		})
		const root = wrapper.find('.cn-widget-wrapper')
		// jsdom computes no layout, so the assertion is on the modifier classes
		// that carry the rules. The rules themselves are asserted in a browser,
		// in dossiq's case-detail e2e, where a computed border width can be read.
		expect(root.classes()).toContain('cn-widget-wrapper--chromeless')
		expect(root.classes()).toContain('cn-widget-wrapper--borderless')
		expect(root.classes()).toContain('cn-widget-wrapper--flush')
		expect(wrapper.find('.cn-widget-wrapper__header-left').exists()).toBe(false)
		expect(wrapper.text()).not.toContain('Data')
	})

	it('keeps the wrapper element, because the widget measures against it', () => {
		const wrapper = mount(CnWidgetWrapper, {
			propsData: { title: 'Data', chromeless: true },
		})
		// The node `closest('.cn-widget-wrapper__content')` has to reach.
		expect(wrapper.find('.cn-widget-wrapper__content').exists()).toBe(true)
	})

	it('overrides showTitle rather than asking the caller to repeat itself', () => {
		// `showTitle` defaults to TRUE, so a surface that names the widget
		// already would otherwise have to remember to also turn the title off.
		const wrapper = mount(CnWidgetWrapper, {
			propsData: { title: 'Data', chromeless: true, showTitle: true },
		})
		expect(wrapper.find('.cn-widget-wrapper__title').exists()).toBe(false)
	})

	it('names the content region by the hidden title', () => {
		// WCAG 4.1.2: the content area is a focusable region, so it needs an
		// accessible name. With no title rendered there is no id to point
		// `aria-labelledby` at, and the title becomes the label instead.
		const wrapper = mount(CnWidgetWrapper, {
			propsData: { title: 'Data', chromeless: true },
		})
		const content = wrapper.find('.cn-widget-wrapper__content')
		expect(content.attributes('aria-label')).toBe('Data')
		expect(content.attributes('aria-labelledby')).toBeUndefined()
	})

	it('keeps controls, because a control is not chrome', () => {
		// The Save button that commits an inline edit lives in this header. A
		// panel that drops it is silently unsaveable, which is the failure this
		// whole contract had to avoid on the way to removing the doubled title.
		const wrapper = mount(CnWidgetWrapper, {
			propsData: { title: 'Data', chromeless: true },
			slots: { actions: '<button data-testid="save">Save</button>' },
		})
		expect(wrapper.find('[data-testid="save"]').exists()).toBe(true)
		expect(wrapper.find('.cn-widget-wrapper__header--actions-only').exists()).toBe(true)
	})

	it('leaves a normal widget alone', () => {
		const wrapper = mount(CnWidgetWrapper, { propsData: { title: 'Data' } })
		const root = wrapper.find('.cn-widget-wrapper')
		expect(root.classes()).not.toContain('cn-widget-wrapper--chromeless')
		expect(root.classes()).not.toContain('cn-widget-wrapper--borderless')
		expect(wrapper.find('.cn-widget-wrapper__title').exists()).toBe(true)
	})
})

describe('CnObjectDataWidget — chromeless', () => {
	it('forwards it, instead of dropping it into $attrs', () => {
		// Until it was a declared prop, `chromeless` fell through to the
		// wrapper's root element as a plain HTML attribute and changed nothing:
		// a caller asking for the documented thing got a silent no-op, with an
		// attribute in the DOM to suggest it had worked.
		const widget = mount(CnObjectDataWidget, {
			propsData: {
				title: 'Data',
				schema: SCHEMA,
				objectData: { title: 'A case' },
				objectType: 'case',
				chromeless: true,
			},
		})
		expect(widget.findComponent(CnWidgetWrapper).props('chromeless')).toBe(true)
		expect(widget.find('.cn-widget-wrapper--chromeless').exists()).toBe(true)
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

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard widget receives as props only the content keys it declares
 * (dashboard-declared-widget-props). An undeclared key used to fall through
 * as an attribute onto the widget's root component, where it could override
 * a value the widget computes (the CnInteractionFormWidget submitLabel bug).
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'
import { resetDeclaredPropWarnings } from '../../src/utils/declaredProps.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const GridStub = { props: ['layout'], template: '<div><template v-for="item in layout" :key="item.id"><slot name="widget" :item="item" /></template></div>' }

const Badge = { name: 'Badge', props: ['label'], template: '<span class="badge">{{ label }}</span>' }

// A widget whose root is a component it gives a computed `label`.
const LabelledWidget = {
	name: 'LabelledWidget',
	components: { Badge },
	props: { content: { type: Object, default: () => ({}) }, heading: { type: String, default: '' } },
	template: '<Badge label="Computed" />',
}

// A widget that reads nothing from `content`.
const BareWidget = {
	name: 'BareWidget',
	props: { heading: { type: String, default: '' } },
	template: '<p class="bare">{{ heading }}</p>',
}

// A widget that forwards its attributes itself.
const ForwardingWidget = {
	name: 'ForwardingWidget',
	inheritAttrs: false,
	props: { content: { type: Object, default: () => ({}) } },
	template: '<div class="forwarding">{{ Object.keys($attrs).filter((k) => !k.startsWith(\'on\')).sort().join(\',\') }}</div>',
}

function mountPage(widgets, cnRegistry = {}) {
	return mount(CnDashboardPage, {
		props: {
			widgets,
			layout: widgets.map((w, i) => ({ id: i + 1, widgetId: w.id, gridX: 0, gridY: i, gridWidth: 6, gridHeight: 2 })),
		},
		global: { provide: { cnRegistry }, stubs: { CnDashboardGrid: GridStub } },
	})
}

let warn
beforeEach(() => {
	resetDeclaredPropWarnings()
	warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
	warn.mockRestore()
})

describe('CnDashboardPage binds only declared content keys', () => {
	it('does not let an undeclared content key override what the widget computes', async () => {
		const w = mountPage([{ id: 'w', type: 'labelled', title: 'W', content: { heading: 'Hello', label: 'From content' } }], { labelled: LabelledWidget })
		await nextTick()
		expect(w.find('.badge').text()).toBe('Computed')
	})

	it('still passes the declared keys as props and the whole content as `content`', async () => {
		const content = { heading: 'Hello', label: 'From content' }
		const w = mountPage([{ id: 'w', type: 'labelled', title: 'W', content }], { labelled: LabelledWidget })
		await nextTick()
		const widget = w.findComponent(LabelledWidget)
		expect(widget.props('heading')).toBe('Hello')
		expect(widget.props('content')).toEqual(content)
	})

	it('warns once per widget type and key when the widget declares neither the key nor `content`', async () => {
		const widgets = [
			{ id: 'a', type: 'bare', title: 'A', content: { heading: 'A', label: 'x' } },
			{ id: 'b', type: 'bare', title: 'B', content: { heading: 'B', label: 'y' } },
		]
		mountPage(widgets, { bare: BareWidget })
		await nextTick()
		const calls = warn.mock.calls.filter(([msg]) => String(msg).includes('content key "label"'))
		expect(calls).toHaveLength(1)
		expect(calls[0][0]).toContain('"bare"')
	})

	it('does not warn about a key a widget can read from `content`', async () => {
		mountPage([{ id: 'w', type: 'labelled', title: 'W', content: { label: 'x' } }], { labelled: LabelledWidget })
		await nextTick()
		expect(warn.mock.calls.some(([msg]) => String(msg).includes('content key'))).toBe(false)
	})

	it('gives a widget with inheritAttrs: false every content key, as before', async () => {
		const w = mountPage([{ id: 'w', type: 'fwd', title: 'W', content: { alpha: 1, beta: 2 } }], { fwd: ForwardingWidget })
		await nextTick()
		expect(w.find('.forwarding').text()).toBe('alpha,beta,widgetId')
		expect(warn.mock.calls.some(([msg]) => String(msg).includes('content key'))).toBe(false)
	})

	it('keeps a tabs widget\'s ariaLabel off its root element and on its tab strip', async () => {
		const w = mountPage([{ id: 't', type: 'tabs', title: 'T', content: { ariaLabel: 'Bank', tabs: [{ label: 'One' }] } }])
		await nextTick()
		const root = w.find('.cn-tabs-widget')
		expect(root.exists()).toBe(true)
		expect(root.attributes('aria-label')).toBeUndefined()
		expect(root.attributes('arialabel')).toBeUndefined()
		expect(w.find('[role="tablist"]').attributes('aria-label')).toBe('Bank')
	})

	it('passes a library widget its declared content keys and its container bindings', async () => {
		const content = { ariaLabel: 'Bank', showActions: false, tabs: [{ label: 'One' }] }
		const w = mountPage([{ id: 't', type: 'tabs', title: 'T', content }])
		await nextTick()
		const tabs = w.findComponent(CnTabsWidget)
		expect(tabs.props('showActions')).toBe(false)
		expect(tabs.props('content')).toEqual(content)
		expect(tabs.props('availableWidgets').map((def) => def.id)).toEqual(['t'])
	})

	it('passes a widget that reads everything from `content` its whole content', async () => {
		const content = { label: 'Open', valueField: 'count', source: { register: 'r', schema: 's' } }
		const w = mountPage([{ id: 's', type: 'stat', title: 'S', content }])
		await nextTick()
		expect(w.findComponent(CnStatWidget).props('content')).toEqual(content)
	})
})

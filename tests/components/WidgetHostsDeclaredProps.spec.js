/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The detail page's widget host and the index page's widget row pass a widget
 * only the content keys it declares (declared-props-detail-index-sidebar), as
 * the dashboard does. An undeclared key used to fall through onto the
 * widget's root component and could override a value the widget computes.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnIndexPageWidgets from '../../src/components/CnIndexPage/CnIndexPageWidgets.vue'
import { resetDeclaredPropWarnings } from '../../src/utils/declaredProps.js'

const Badge = { name: 'Badge', props: ['label'], template: '<span class="badge">{{ label }}</span>' }

// A widget whose root component gets a label the widget computes.
const LabelledWidget = {
	name: 'LabelledWidget',
	components: { Badge },
	props: { content: { type: Object, default: () => ({}) }, heading: { type: String, default: '' } },
	template: '<Badge label="Computed" />',
}

const CONTENT = { heading: 'Hello', label: 'From content' }

let warn
beforeEach(() => {
	resetDeclaredPropWarnings()
	warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
	warn.mockRestore()
})

describe.each([
	['in a plain cell', undefined],
	['in a card', 'card'],
])('CnDetailWidgetHost %s', (_, chrome) => {
	function mountHost() {
		return mount(CnDetailWidgetHost, {
			props: { widget: { id: 'w', type: 'labelled', title: 'W', content: CONTENT }, chrome, objectId: 'p-1', cnRegistry: { labelled: LabelledWidget } },
		})
	}

	it('does not let an undeclared content key override what the widget computes', async () => {
		const w = mountHost()
		await nextTick()
		expect(w.find('.badge').text()).toBe('Computed')
	})

	it('still passes the declared keys and the whole content', async () => {
		const w = mountHost()
		await nextTick()
		const widget = w.findComponent(LabelledWidget)
		expect(widget.props('heading')).toBe('Hello')
		expect(widget.props('content')).toEqual(CONTENT)
	})
})

describe('CnIndexPageWidgets', () => {
	function mountRow(cnRegistry) {
		return mount(CnIndexPageWidgets, {
			props: { widgets: [{ id: 'w', type: 'labelled', content: CONTENT }] },
			global: { provide: { cnRegistry } },
		})
	}

	it('does not let an undeclared content key override what the widget computes', async () => {
		const w = mountRow({ labelled: LabelledWidget })
		await nextTick()
		expect(w.find('.badge').text()).toBe('Computed')
	})

	it('still passes the declared keys and the whole content', async () => {
		const w = mountRow({ labelled: LabelledWidget })
		await nextTick()
		const widget = w.findComponent(LabelledWidget)
		expect(widget.props('heading')).toBe('Hello')
		expect(widget.props('content')).toEqual(CONTENT)
	})

	it('warns once when a widget declares neither the key nor `content`', async () => {
		const Bare = { name: 'Bare', props: ['heading'], template: '<p>{{ heading }}</p>' }
		mountRow({ labelled: Bare })
		await nextTick()
		const calls = warn.mock.calls.filter(([msg]) => String(msg).includes('content key "label"'))
		expect(calls).toHaveLength(1)
		expect(calls[0][0]).toContain('"labelled"')
	})
})

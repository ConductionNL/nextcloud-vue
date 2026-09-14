/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget with no header of its own lends its overflow-menu items to the
 * surface hosting it, and a widget that still has a header keeps them.
 *
 * The browser suite (e2e/bare-data-widget.e2e.js) covers the working path: the
 * items reach the tab strip's menu, only the open panel's are offered, and
 * clicking one opens the publishing widget's own dialog.
 *
 * What is left for here is the rule that path cannot show, because it is about
 * what must NOT happen on a surface the e2e harness does not render: a widget
 * with its own header must publish nothing. Publishing anyway would put the same
 * two entries in two menus on one screen, and the duplicate is invisible in the
 * tab-panel case because there the widget's own menu is suppressed. So the case
 * that catches it is the card, which is also every other surface in the fleet.
 */

import { mount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'
import { PANEL_ACTION_SINK } from '../../src/utils/panelActions.js'

const SCHEMA = {
	title: 'Case',
	properties: {
		title: { type: 'string', title: 'Title' },
	},
}

/**
 * Mount the widget over a recording sink, the way a host surface provides one.
 *
 * @param {object} props Props to merge over the defaults.
 * @return {{ wrapper: object, published: Array, cleared: number }} The mount and what it published.
 */
function mountWithSink(props = {}) {
	const published = []
	const state = { cleared: 0 }
	const wrapper = mount(CnObjectDataWidget, {
		propsData: {
			schema: SCHEMA,
			objectData: { id: 'o1', title: 'A case' },
			objectType: 'case',
			...props,
		},
		global: {
			provide: {
				[PANEL_ACTION_SINK]: {
					set: (items) => published.push(items),
					clear: () => {
						state.cleared += 1
					},
				},
			},
		},
	})
	return { wrapper, published, state }
}

describe('a widget lending its menu items to a host surface', () => {
	// THE RULE. With its own header, the items already have a home.
	it('publishes nothing while it still draws its own actions menu', () => {
		const { published } = mountWithSink({ showActions: true })
		expect(published).toEqual([])
	})

	it('publishes its items once its own menu is suppressed', () => {
		const { published } = mountWithSink({ showActions: false })
		expect(published).toHaveLength(1)
		expect(published[0].map((a) => a.key)).toEqual(['edit', 'metadata'])
	})

	// Every descriptor has to be renderable and clickable by a component that
	// knows nothing about this widget, so the shape is part of the contract.
	it('describes each item with a label, an icon and a callback', () => {
		const { published } = mountWithSink({ showActions: false })
		for (const action of published[0]) {
			expect(typeof action.key).toBe('string')
			expect(action.label.length).toBeGreaterThan(0)
			expect(action.icon.length).toBeGreaterThan(0)
			expect(typeof action.run).toBe('function')
		}
	})

	// `run` has to reach the publishing widget's own state. The e2e proves this
	// end to end through a real click; this pins the mechanism itself, so a
	// refactor that breaks the closure fails here first and more cheaply.
	it('runs its callback against the widget that published it', () => {
		const { wrapper, published } = mountWithSink({ showActions: false })
		const metadata = published[0].find((a) => a.key === 'metadata')

		expect(wrapper.vm.metadataModalOpen).toBe(false)
		metadata.run()
		expect(wrapper.vm.metadataModalOpen).toBe(true)
	})

	// A read-only widget offering a full edit form is a dead end, which is why
	// the header item is gated the same way.
	it('omits the edit item when the widget is not editable', () => {
		const { published } = mountWithSink({ showActions: false, editable: false })
		expect(published[0].map((a) => a.key)).toEqual(['metadata'])
	})

	// A closed tab's panel can be torn down while the strip lives on. An item
	// left behind would open a dialog belonging to a component that is gone.
	it('withdraws its items when it is torn down', () => {
		const { wrapper, state } = mountWithSink({ showActions: false })
		expect(state.cleared).toBe(0)
		wrapper.unmount()
		expect(state.cleared).toBeGreaterThan(0)
	})

	// Nothing to publish to is the normal case: every surface except a tab panel
	// provides no sink at all, and the widget must mount and work regardless.
	it('mounts and renders normally with no surface to publish to', () => {
		const wrapper = mount(CnObjectDataWidget, {
			propsData: {
				schema: SCHEMA,
				objectData: { id: 'o1', title: 'A case' },
				objectType: 'case',
				showActions: false,
			},
		})
		expect(wrapper.find('.cn-object-data-widget__grid').exists()).toBe(true)
	})
})

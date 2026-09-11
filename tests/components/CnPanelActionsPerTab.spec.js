/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The open tab decides what the strip's Actions menu offers.
 *
 * That is the rule a reader expects, and it was only half true. A panel draws no
 * header, so anything that header would have carried is gone unless it is
 * published to the surface. `CnObjectDataWidget` publishes its Metadata and edit
 * items. `CnDetailWidgetHost` did not publish its own: the catalog Add lives in
 * the card header the host draws off a panel, so a Documents or Files tab had no
 * way to add anything at all.
 *
 * Reported from a real dossiq case, where the Actions menu on the Data tab
 * offered only the built-in trio.
 *
 * The two publishers are the reason the channel keys by SOURCE as well as by
 * widget id. With one slot per widget, whichever published last replaced the
 * other, so a panel that had both would silently lose one. The last describe
 * below is about that collision specifically.
 */

import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { PANEL_ACTION_SINK } from '../../src/utils/panelActions.js'

/**
 * A recording stand-in for the surface's channel.
 *
 * @return {object} The sink plus the state it recorded.
 */
function recordingSink() {
	const published = {}
	const calls = []
	return {
		published,
		calls,
		set: (id, items, source) => {
			calls.push(['set', id, source]); published[`${id}::${source}`] = items
		},
		clear: (id, source) => {
			calls.push(['clear', id, source]); delete published[`${id}::${source}`]
		},
	}
}

/**
 * Mount a host for one widget definition over a recording sink.
 *
 * @param {object} widget The widget definition.
 * @param {string} chrome `bare` for a tab panel, `card` for a grid surface.
 * @return {{ wrapper: object, sink: object }} The mount and the sink.
 */
function mountHost(widget, chrome) {
	const sink = recordingSink()
	const wrapper = mount(CnDetailWidgetHost, {
		propsData: { widget, chrome, objectId: 'o1', object: { id: 'o1' }, objectType: 'case' },
		global: { provide: { [PANEL_ACTION_SINK]: sink } },
	})
	return { wrapper, sink }
}

const CATALOG = { id: 'case-files', type: 'object-list', title: 'Documents', content: {} }

describe('a catalog panel lends its Add to the strip', () => {
	it('publishes Add under the host source when it is a panel', () => {
		const { sink } = mountHost(CATALOG, 'bare')
		const items = sink.published['case-files::host']
		expect(items).toBeTruthy()
		expect(items.map((a) => a.key)).toEqual(['catalog-add'])
		expect(items[0].label).toBeTruthy()
		expect(typeof items[0].run).toBe('function')
	})

	// Off a panel the host draws the item in its own card header, so publishing
	// too would put the same Add in two menus on one screen.
	it('publishes nothing on a card surface', () => {
		const { sink } = mountHost(CATALOG, 'card')
		expect(sink.published['case-files::host']).toBeUndefined()
	})

	// `allowCreate: false` is a deployment saying this list is read-only. The
	// published item has to respect that, or a panel offers an Add that a card
	// does not.
	it('publishes nothing when the deployment refused creation', () => {
		const widget = { ...CATALOG, content: { allowCreate: false } }
		const { sink } = mountHost(widget, 'bare')
		expect(sink.published['case-files::host']).toBeUndefined()
	})

	it('publishes nothing for a widget type that has no Add', () => {
		const { sink } = mountHost({ id: 'case-geo', type: 'object-geo', title: 'Map', content: {} }, 'bare')
		expect(sink.published['case-geo::host']).toBeUndefined()
	})

	// A closed tab can be torn down while the strip lives on, and an item whose
	// host is gone would call into nothing.
	it('withdraws its items when the panel is torn down', () => {
		const { wrapper, sink } = mountHost(CATALOG, 'bare')
		expect(sink.published['case-files::host']).toBeTruthy()
		wrapper.unmount()
		expect(sink.published['case-files::host']).toBeUndefined()
	})

	// The click has to reach the host's own create path, which is what opens the
	// dialog on the rendered list. A descriptor whose callback goes nowhere looks
	// identical in the menu and does nothing.
	//
	// Spied on the instance rather than by replacing `$refs`, which Vue 3 makes
	// non-extensible: the descriptor calls `this.invokeCatalogAdd()` at click
	// time, so the spy is what runs.
	it('runs the host\'s create path', () => {
		const { wrapper, sink } = mountHost(CATALOG, 'bare')
		const spy = jest.spyOn(wrapper.vm, 'invokeCatalogAdd').mockImplementation(() => {})
		sink.published['case-files::host'][0].run()
		expect(spy).toHaveBeenCalledTimes(1)
	})
})

describe('the host and the widget publish side by side', () => {
	// THE COLLISION. Both publishers use the same widget id, so a channel keyed
	// by id alone loses whichever wrote first.
	it('keeps both sources for one widget', () => {
		const sink = recordingSink()
		sink.set('w', [{ key: 'catalog-add' }], 'host')
		sink.set('w', [{ key: 'metadata' }], 'widget')
		expect(Object.keys(sink.published).sort()).toEqual(['w::host', 'w::widget'])
	})

	it('clearing one source leaves the other', () => {
		const sink = recordingSink()
		sink.set('w', [{ key: 'catalog-add' }], 'host')
		sink.set('w', [{ key: 'metadata' }], 'widget')
		sink.clear('w', 'widget')
		expect(Object.keys(sink.published)).toEqual(['w::host'])
	})

	// The host narrows the channel for the widget below it, baking in both the
	// id and the `widget` source. If it stopped naming the source, the widget's
	// items would land in the host's slot and replace the Add.
	it('the host narrows the channel with the widget source baked in', () => {
		const { wrapper, sink } = mountHost(CATALOG, 'bare')
		const narrowed = wrapper.vm.$.provides[PANEL_ACTION_SINK]
		narrowed.set([{ key: 'metadata' }])
		expect(sink.published['case-files::widget']).toBeTruthy()
		expect(sink.published['case-files::host']).toBeTruthy()
	})
})

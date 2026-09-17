/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A panel whose sections are hosts of their own reaches the strip's Actions
 * menu without corrupting it.
 *
 * A nested host holds the narrowed `set(items)` channel but used to call it
 * with the surface's `set(id, items, source)`, so its widget id landed where
 * the items belong — and the strip spread that string into one menu item per
 * character.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'
import { PANEL_ACTION_SINK } from '../../src/utils/panelActions.js'

const ITEMS = [{ key: 'edit', label: 'Edit', icon: 'Pencil', run: () => {} }]

/** A widget that publishes menu items, the way CnObjectDataWidget does. */
const PublishingWidget = {
	name: 'PublishingWidget',
	inject: { panelActionSink: { from: PANEL_ACTION_SINK, default: null } },
	mounted() {
		this.panelActionSink?.set(ITEMS)
	},
	render: () => h('div', 'published'),
}

/**
 * A panel holding one section, the section an ordinary widget in a host of its
 * own — the shape dossiq's `case-sections` renders.
 */
const SectionsWidget = {
	name: 'SectionsWidget',
	props: { objectId: { type: String, default: '' } },
	render() {
		return h(CnDetailWidgetHost, {
			widget: { id: 'case-priority', type: 'publishing' },
			chrome: 'bare',
			objectId: this.objectId,
			cnRegistry: registry,
		})
	},
}

const registry = {
	sections: { kind: 'widget', component: SectionsWidget },
	publishing: { kind: 'widget', component: PublishingWidget },
}

const WIDGETS = [{ id: 'case-data-panel', type: 'sections', title: 'Data' }]

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountStrip() {
	return mount(CnTabsWidget, {
		props: {
			content: { tabs: [{ widgetId: 'case-data-panel', label: 'Data' }] },
			availableWidgets: WIDGETS,
			objectId: 'obj-1',
			register: 'dossiq',
			schema: 'case',
			cnRegistry: registry,
		},
	})
}

describe('CnTabsWidget — a panel whose sections are hosts of their own', () => {
	it('offers the section widget’s items on the panel that shows it', async () => {
		const w = mountStrip()
		await flush()

		expect(w.vm.activePanelActions).toEqual([
			expect.objectContaining({ key: 'edit', label: 'Edit', icon: 'Pencil' }),
		])
	})

	// The symptom as it reached the user: thirteen items, no label, a
	// question-mark icon, and nothing happens on click.
	it('offers no item without a label or a runnable', async () => {
		const w = mountStrip()
		await flush()

		expect(w.vm.activePanelActions.length).toBeGreaterThan(0)
		for (const action of w.vm.activePanelActions) {
			expect(typeof action.label).toBe('string')
			expect(action.label.length).toBeGreaterThan(0)
			expect(typeof action.run).toBe('function')
		}
	})

	it('stores a panel’s items as items, never a widget id', async () => {
		const w = mountStrip()
		await flush()

		const stored = Object.values(w.vm.panelActionsByWidget)
			.flatMap((forId) => Object.values(forId))
		expect(stored.length).toBeGreaterThan(0)
		for (const items of stored) {
			expect(Array.isArray(items)).toBe(true)
		}
	})

	it('refuses anything that is not an array, whatever the publisher sends', async () => {
		const w = mountStrip()
		await flush()
		const before = w.vm.panelActionsByWidget

		// Reaching for the channel directly is the point: this guards the
		// surface against a publisher that got its own arguments wrong, which
		// is exactly how the thirteen items arrived.
		w.vm.$.provides[PANEL_ACTION_SINK].set('case-data-panel', 'case-priority', 'widget')

		expect(w.vm.panelActionsByWidget).toBe(before)
	})
})

describe('CnDetailWidgetHost — the channel it provides when nested', () => {
	/**
	 * Mount a host holding a surface-shaped channel, and read back what its own
	 * provided channel forwards.
	 *
	 * @return {object} The host wrapper and the surface sink's spies.
	 */
	function mountHost() {
		const surface = { set: jest.fn(), clear: jest.fn() }
		const wrapper = mount(CnDetailWidgetHost, {
			propsData: {
				widget: { id: 'case-data-panel', type: 'publishing' },
				chrome: 'bare',
				objectId: 'o1',
				cnRegistry: registry,
			},
			global: { provide: { [PANEL_ACTION_SINK]: surface } },
		})
		return { wrapper, surface }
	}

	it('publishes a widget’s items under this panel', () => {
		const { wrapper, surface } = mountHost()
		wrapper.vm.$.provides[PANEL_ACTION_SINK].set(ITEMS)

		expect(surface.set).toHaveBeenCalledWith('case-data-panel', ITEMS, 'widget')
	})

	it('re-keys a nested host’s call onto this panel instead of shifting it', () => {
		const { wrapper, surface } = mountHost()
		// A nested host speaks the surface's own shape.
		wrapper.vm.$.provides[PANEL_ACTION_SINK].set('case-priority', ITEMS, 'host')

		expect(surface.set).toHaveBeenCalledWith('case-data-panel', ITEMS, 'host')
	})

	it('withdraws under the source it was given, not always the widget', () => {
		const { wrapper, surface } = mountHost()
		wrapper.vm.$.provides[PANEL_ACTION_SINK].clear('case-priority', 'host')

		expect(surface.clear).toHaveBeenCalledWith('case-data-panel', 'host')
	})

	it('withdraws the widget’s own items on a bare clear()', () => {
		const { wrapper, surface } = mountHost()
		wrapper.vm.$.provides[PANEL_ACTION_SINK].clear()

		expect(surface.clear).toHaveBeenCalledWith('case-data-panel', 'widget')
	})
})

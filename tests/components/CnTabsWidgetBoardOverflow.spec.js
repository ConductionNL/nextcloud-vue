/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board look (DqZaakMeer, DqZaakBesluiten): the strip draws the pinned tabs,
 * the overflow tabs are listed at the top of the Actions menu beside it, and
 * an opened overflow tab joins the strip just before the last tab.
 *
 * @spec openspec/changes/board-tabs-overflow-in-actions/specs/board-tabs-overflow-in-actions/spec.md
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTab from '../../src/components/CnTabs/CnTab.vue'
import CnTabs from '../../src/components/CnTabs/CnTabs.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-overview', type: 'object-list', title: 'Overview' },
	{ id: 'w-files', type: 'object-list', title: 'Files' },
	{ id: 'w-contact', type: 'object-list', title: 'Contact' },
	{ id: 'w-tasks', type: 'object-list', title: 'Tasks' },
	{ id: 'w-history', type: 'audit-trail', title: 'Audit trail' },
	{ id: 'w-notes', type: 'object-list', title: 'Notes' },
	{ id: 'w-decisions', type: 'object-list', title: 'Decisions' },
	{ id: 'w-archiving', type: 'object-list', title: 'Archiving' },
]

const CASE_TABS = {
	maxVisibleTabs: 5,
	tabs: [
		{ widgetId: 'w-overview' },
		{ widgetId: 'w-files' },
		{ widgetId: 'w-contact' },
		{ widgetId: 'w-tasks' },
		{ widgetId: 'w-history' },
		{ widgetId: 'w-notes', overflow: true },
		{ widgetId: 'w-decisions', overflow: true },
		{ widgetId: 'w-archiving', overflow: true },
	],
}

function mountWidget(look, content, props = {}) {
	return mount(CnTabsWidget, {
		props: { content, availableWidgets: WIDGETS, objectId: 'o1', register: 'r', schema: 's', ...props },
		attachTo: document.body,
		global: {
			provide: look ? { cnLook: look } : {},
			stubs: { CnDetailWidgetHost: { template: '<div class="host" />' } },
		},
	})
}

const stripOf = (w) => w.findAll('[role="tab"]').map((t) => t.text())

describe('CnTabsWidget overflow in the board look', () => {
	it('draws the pinned tabs and lists the overflow tabs in the Actions menu, not under "More"', async () => {
		const w = mountWidget('board', CASE_TABS)
		await nextTick()
		expect(stripOf(w)).toEqual(['Overview', 'Files', 'Contact', 'Tasks', 'History'])
		expect(w.vm.menuTabs.map((tab) => tab.label)).toEqual(['Notes', 'Decisions', 'Archiving'])
		expect(w.find('[data-testid="cn-tabs-more"]').exists()).toBe(false)
		w.unmount()
	})

	it('puts an opened overflow tab in the strip before the last tab and drops it from the menu', async () => {
		const w = mountWidget('board', CASE_TABS)
		await nextTick()
		w.vm.openMenuTab(w.vm.menuTabs.find((tab) => tab.label === 'Decisions'))
		await nextTick()
		await nextTick()
		expect(stripOf(w)).toEqual(['Overview', 'Files', 'Contact', 'Tasks', 'Decisions', 'History'])
		expect(w.find('[role="tab"][aria-selected="true"]').text()).toBe('Decisions')
		expect(w.vm.menuTabs.map((tab) => tab.label)).toEqual(['Notes', 'Archiving'])
		expect(document.activeElement?.textContent?.trim()).toBe('Decisions')
		w.unmount()
	})

	it('honours maxVisibleTabs and keeps History in the strip', async () => {
		const w = mountWidget('board', {
			maxVisibleTabs: 3,
			tabs: [{ widgetId: 'w-overview' }, { widgetId: 'w-files' }, { widgetId: 'w-contact' }, { widgetId: 'w-tasks' }, { widgetId: 'w-history' }],
		})
		await nextTick()
		expect(stripOf(w)).toEqual(['Overview', 'Files', 'History'])
		expect(w.vm.menuTabs.map((tab) => tab.label)).toEqual(['Contact', 'Tasks'])
		w.unmount()
	})

	it('keeps a menu for the overflow tabs when the widget turns its actions off', async () => {
		const w = mountWidget('board', CASE_TABS, { showActions: false })
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-widget-actions"]').exists()).toBe(true)
		expect(w.vm.menuTabs).toHaveLength(3)
		w.unmount()
	})

	it('draws no menu with actions off and nothing to overflow', async () => {
		const w = mountWidget('board', { tabs: [{ widgetId: 'w-overview' }, { widgetId: 'w-history' }] }, { showActions: false })
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-widget-actions"]').exists()).toBe(false)
		w.unmount()
	})

	it('keeps "More" and lists nothing in the Actions menu without the board look', async () => {
		const w = mountWidget(null, CASE_TABS)
		await nextTick()
		expect(stripOf(w)).toEqual(['Overview', 'Files', 'Contact', 'Tasks', 'Audit trail'])
		expect(w.find('[data-testid="cn-tabs-more"]').exists()).toBe(true)
		expect(w.vm.menuTabs).toEqual([])
		w.unmount()
	})
})

describe('CnTabs overflowInNavEnd', () => {
	function mountStrip(overflowInNavEnd, activeLast = false) {
		return mount({
			components: { CnTabs, CnTab },
			template: `<CnTabs aria-label="Parts" :overflowInNavEnd="flag">
				<CnTab title="One">1</CnTab>
				<CnTab title="Extra" overflow :active="activeLast">x</CnTab>
				<CnTab title="Two">2</CnTab>
				<CnTab title="Last">3</CnTab>
			</CnTabs>`,
			data: () => ({ flag: overflowInNavEnd, activeLast }),
		})
	}

	it('leaves overflow tabs out of the strip and draws no "More"', async () => {
		const w = mountStrip(true)
		await nextTick()
		expect(stripOf(w)).toEqual(['One', 'Two', 'Last'])
		expect(w.find('[data-testid="cn-tabs-more"]').exists()).toBe(false)
	})

	it('places a selected overflow tab before the last tab', async () => {
		const w = mountStrip(true, true)
		await nextTick()
		expect(stripOf(w)).toEqual(['One', 'Two', 'Extra', 'Last'])
	})

	it('keeps the source order and "More" without the flag', async () => {
		const w = mountStrip(false, true)
		await nextTick()
		expect(stripOf(w)).toEqual(['One', 'Extra', 'Two', 'Last'])
	})
})

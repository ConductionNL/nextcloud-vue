/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tab counts and the "More" menu on CnTabs, and the CnTabsWidget content keys
 * that drive them (`count`, `countField`, `overflow`, `maxVisibleTabs`,
 * `hideEmpty`).
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import CnTab from '../../src/components/CnTabs/CnTab.vue'
import CnTabs from '../../src/components/CnTabs/CnTabs.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

/**
 * Mount a strip of plain-titled tabs and wait for them to register.
 *
 * @param {Array<object>} tabs Per-tab props.
 * @param {object} [stripProps] Props for the strip.
 * @return {Promise<object>} The mounted wrapper.
 */
async function mountStrip(tabs, stripProps = {}) {
	const wrapper = mount(defineComponent({
		render() {
			return h(CnTabs, stripProps, {
				default: () => tabs.map((t, i) => h(CnTab, { ...t, key: i }, { default: () => `panel ${i}` })),
			})
		},
	}), { attachTo: document.body })
	await nextTick()
	return wrapper
}

const navTabs = (wrapper) => wrapper.findAll('[role="tab"]')
const moreItems = (wrapper) => wrapper.findAll('[data-testid="cn-tabs-more-item"]')
const names = (list) => list.map((node) => node.text().replace(/\s+/g, ' '))

describe('CnTabs counts', () => {
	it('shows a count after the title, inside the tab so it is part of its name', async () => {
		const wrapper = await mountStrip([{ title: 'Documents', count: 5 }, { title: 'History' }])
		expect(names(navTabs(wrapper))).toEqual(['Documents 5', 'History'])
		expect(wrapper.findAll('[data-testid="cn-tabs-count"]')).toHaveLength(1)
		wrapper.unmount()
	})

	it('shows a count of zero, and no count for null or an empty string', async () => {
		const wrapper = await mountStrip([{ title: 'A', count: 0 }, { title: 'B', count: null }, { title: 'C', count: '' }])
		expect(names(navTabs(wrapper))).toEqual(['A 0', 'B', 'C'])
		wrapper.unmount()
	})
})

describe('CnTabs "More" menu', () => {
	const tabs = [
		{ title: 'Overview' },
		{ title: 'Documents', count: 5 },
		{ title: 'Archiving', overflow: true },
		{ title: 'Fees', overflow: true, count: 2 },
	]

	it('renders no menu when no tab overflows, so an existing strip is unchanged', async () => {
		const wrapper = await mountStrip([{ title: 'A' }, { title: 'B' }])
		expect(wrapper.find('[data-testid="cn-tabs-more"]').exists()).toBe(false)
		expect(wrapper.find('.cn-tabs__more').exists()).toBe(false)
		wrapper.unmount()
	})

	it('keeps overflow tabs out of the strip and lists them under More', async () => {
		const wrapper = await mountStrip(tabs)
		expect(names(navTabs(wrapper))).toEqual(['Overview', 'Documents 5'])
		expect(names(moreItems(wrapper))).toEqual(['Archiving', 'Fees (2)'])
		wrapper.unmount()
	})

	it('puts the menu outside the tablist, so it is not announced as a tab', async () => {
		const wrapper = await mountStrip(tabs)
		expect(wrapper.find('[role="tablist"] [data-testid="cn-tabs-more"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-tabs-more"]').exists()).toBe(true)
		wrapper.unmount()
	})

	it('names the menu "More" by default and takes another name', async () => {
		const standard = await mountStrip(tabs)
		expect(standard.findComponent({ name: 'NcActions' }).attributes('menuname')
			?? standard.findComponent({ name: 'NcActions' }).vm.$attrs.menuName).toBe('More')
		standard.unmount()
		const dutch = await mountStrip(tabs, { moreLabel: 'Meer' })
		expect(dutch.findComponent({ name: 'NcActions' }).attributes('menuname')
			?? dutch.findComponent({ name: 'NcActions' }).vm.$attrs.menuName).toBe('Meer')
		dutch.unmount()
	})

	it('selects a tab picked from the menu, shows it in the strip and focuses it', async () => {
		const wrapper = await mountStrip(tabs)
		await moreItems(wrapper)[0].trigger('click')
		await nextTick()
		await nextTick()

		expect(names(navTabs(wrapper))).toEqual(['Overview', 'Documents 5', 'Archiving'])
		const picked = navTabs(wrapper)[2]
		expect(picked.attributes('aria-selected')).toBe('true')
		expect(document.activeElement).toBe(picked.element)
		expect(names(moreItems(wrapper))).toEqual(['Fees (2)'])

		const visiblePanels = wrapper.findAll('[role="tabpanel"]').filter((panel) => panel.attributes('hidden') === undefined)
		expect(visiblePanels).toHaveLength(1)
		expect(visiblePanels[0].text()).toBe('panel 2')
		// The open panel is labelled by a tab that exists in the document.
		expect(document.getElementById(visiblePanels[0].attributes('aria-labelledby'))).toBe(picked.element)
		wrapper.unmount()
	})

	it('returns the tab to the menu once another tab is selected', async () => {
		const wrapper = await mountStrip(tabs)
		await moreItems(wrapper)[0].trigger('click')
		await nextTick()
		await navTabs(wrapper)[0].trigger('click')
		await nextTick()
		expect(names(navTabs(wrapper))).toEqual(['Overview', 'Documents 5'])
		expect(names(moreItems(wrapper))).toEqual(['Archiving', 'Fees (2)'])
		wrapper.unmount()
	})

	it('walks only the strip with the arrow keys, never into an overflow tab', async () => {
		const wrapper = await mountStrip(tabs)
		const strip = wrapper.find('[role="tablist"]')
		await strip.trigger('keydown', { key: 'ArrowRight' })
		expect(navTabs(wrapper)[1].attributes('aria-selected')).toBe('true')
		await strip.trigger('keydown', { key: 'ArrowRight' })
		// Wraps to the first strip tab rather than opening "Archiving".
		expect(navTabs(wrapper)[0].attributes('aria-selected')).toBe('true')
		expect(names(navTabs(wrapper))).toEqual(['Overview', 'Documents 5'])
		await strip.trigger('keydown', { key: 'End' })
		expect(navTabs(wrapper)[1].attributes('aria-selected')).toBe('true')
		wrapper.unmount()
	})

	it('shows an overflow tab in the strip when it starts out active', async () => {
		const wrapper = await mountStrip([{ title: 'A' }, { title: 'B', overflow: true, active: true }])
		expect(names(navTabs(wrapper))).toEqual(['A', 'B'])
		expect(wrapper.find('[data-testid="cn-tabs-more"]').exists()).toBe(false)
		wrapper.unmount()
	})
})

describe('CnTabsWidget counts and overflow', () => {
	const WIDGETS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, type: 'text', title: id.toUpperCase() }))

	/**
	 * @param {object} content The widget content.
	 * @param {object} [objectData] The bound record.
	 * @return {Promise<object>} The mounted wrapper.
	 */
	async function mountWidget(content, objectData = null) {
		const wrapper = mount(CnTabsWidget, {
			props: { content, availableWidgets: WIDGETS, objectId: 'obj-1', objectData },
			global: {
				stubs: {
					CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host" />' },
					CnActionsMenu: true,
				},
			},
		})
		await nextTick()
		return wrapper
	}

	it('collapses the tabs past maxVisibleTabs into More', async () => {
		const wrapper = await mountWidget({ maxVisibleTabs: 5, tabs: WIDGETS.map((w) => ({ widgetId: w.id })) })
		expect(navTabs(wrapper)).toHaveLength(5)
		expect(names(moreItems(wrapper))).toEqual(['F', 'G'])
	})

	it('leaves every tab in the strip without maxVisibleTabs', async () => {
		const wrapper = await mountWidget({ tabs: WIDGETS.map((w) => ({ widgetId: w.id })) })
		expect(navTabs(wrapper)).toHaveLength(7)
		expect(wrapper.find('[data-testid="cn-tabs-more"]').exists()).toBe(false)
	})

	it('shows a literal count and one read off the record', async () => {
		const wrapper = await mountWidget(
			{ tabs: [{ widgetId: 'a', count: 5 }, { widgetId: 'b', countField: 'tasks' }, { widgetId: 'c' }] },
			{ tasks: [{}, {}] },
		)
		expect(names(navTabs(wrapper))).toEqual(['A 5', 'B 2', 'C'])
	})

	it('moves an empty tab under More when hideEmpty is set, and only then', async () => {
		const tabs = [{ widgetId: 'a', countField: 'notes' }, { widgetId: 'b', countField: 'tasks' }, { widgetId: 'c' }]
		const record = { notes: [], tasks: [{}] }

		const hidden = await mountWidget({ hideEmpty: true, tabs }, record)
		expect(names(navTabs(hidden))).toEqual(['B 1', 'C'])
		expect(names(moreItems(hidden))).toEqual(['A (0)'])

		const shown = await mountWidget({ tabs }, record)
		expect(names(navTabs(shown))).toEqual(['A 0', 'B 1', 'C'])
	})

	it('does not let a tab that is already under More use up a strip place', async () => {
		const wrapper = await mountWidget({
			maxVisibleTabs: 2,
			tabs: [{ widgetId: 'a', overflow: true }, { widgetId: 'b' }, { widgetId: 'c' }, { widgetId: 'd' }],
		})
		expect(names(navTabs(wrapper))).toEqual(['B', 'C'])
		expect(names(moreItems(wrapper))).toEqual(['A', 'D'])
	})

	it('names the menu from content.moreLabel', async () => {
		const wrapper = await mountWidget({ moreLabel: 'Meer', tabs: [{ widgetId: 'a' }, { widgetId: 'b', overflow: true }] })
		expect(wrapper.findComponent(CnTabs).props('moreLabel')).toBe('Meer')
	})
})

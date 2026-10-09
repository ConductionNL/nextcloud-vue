/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Folder tabs under the board look: the strip takes the board class, never
 * moves a tab under "More", draws no icon, names its tab list from
 * `tabsLabel`, and ends with a labelled secondary Actions button. The pixel
 * values live in look-board-detail.css and are measured by the e2e.
 *
 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-folder-tabs-take-the-board-strip
 */
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import CnActionsMenu from '../../src/components/CnActionsMenu/CnActionsMenu.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnTab from '../../src/components/CnTabs/CnTab.vue'
import CnTabs from '../../src/components/CnTabs/CnTabs.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const provideBoard = { cnLook: 'board' }

function mountStrip(look, extra = {}) {
	return mount({
		components: { CnTabs, CnTab },
		template: `<CnTabs aria-label="Parts" v-bind="extra">
			<CnTab title="Overview">a</CnTab>
			<CnTab title="Documents" :count="7">b</CnTab>
			<CnTab title="Archiving" overflow>c</CnTab>
		</CnTabs>`,
		data: () => ({ extra }),
	}, { global: { provide: look ? { cnLook: look } : {} } })
}

describe('CnTabs in the board look', () => {
	it('carries the board class and keeps every tab in the strip', async () => {
		const w = mountStrip('board')
		await nextTick()
		expect(w.find('.cn-tabs').classes()).toEqual(expect.arrayContaining(['cn-tabs--board', 'cn-look-board']))
		expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(['Overview', 'Documents 7', 'Archiving'])
		expect(w.find('[data-testid="cn-tabs-more"]').exists()).toBe(false)
	})

	it('draws the count as a badge after the label', async () => {
		const w = mountStrip('board')
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-count"]').text()).toBe('7')
	})

	it('keeps the "More" menu and no board class without the look', async () => {
		const w = mountStrip(null)
		await nextTick()
		expect(w.find('.cn-tabs').classes()).not.toContain('cn-tabs--board')
		expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(['Overview', 'Documents 7'])
		expect(w.find('[data-testid="cn-tabs-more"]').exists()).toBe(true)
	})

	it('leaves the segmented variant alone in the board look', async () => {
		const w = mountStrip('board', { variant: 'segmented' })
		await nextTick()
		expect(w.find('.cn-tabs').classes()).not.toContain('cn-tabs--board')
	})

	it('takes its own look prop over the app look', async () => {
		const w = mount(CnTabs, { props: { look: 'board' }, slots: { default: () => h(CnTab, { title: 'One' }, () => 'x') } })
		await nextTick()
		expect(w.classes()).toContain('cn-tabs--board')
	})
})

const WIDGETS = [
	{ id: 'w-history', type: 'audit-trail', title: 'Audit trail', icon: 'Timeline' },
	{ id: 'w-docs', type: 'object-list', title: 'Documents', icon: 'FileOutline' },
	{ id: 'w-tasks', type: 'object-list', title: 'Tasks' },
	{ id: 'w-extra', type: 'object-list', title: 'Archiving' },
]

function mountWidget(look, content, provide = {}) {
	return mount(CnTabsWidget, {
		props: { content, availableWidgets: WIDGETS, objectId: 'o1', register: 'r', schema: 's' },
		global: {
			provide: { ...(look ? { cnLook: look } : {}), ...provide },
			stubs: { CnDetailWidgetHost: { template: '<div class="host" />' } },
		},
	})
}

describe('CnTabsWidget in the board look', () => {
	const content = {
		tabs: [
			{ widgetId: 'w-docs' },
			{ widgetId: 'w-history' },
			{ widgetId: 'w-tasks', overflow: true },
			{ widgetId: 'w-extra' },
		],
		maxVisibleTabs: 2,
	}

	it('renders the activity last and names it History', async () => {
		const w = mountWidget('board', content)
		await nextTick()
		const tabs = w.findAll('[role="tab"]').map((t) => t.text())
		expect(tabs).toEqual(['Documents', 'Tasks', 'Archiving', 'History'])
	})

	it('keeps a label the manifest gives the activity tab', async () => {
		const w = mountWidget('board', { tabs: [{ widgetId: 'w-history', label: 'Historie' }, { widgetId: 'w-docs' }] })
		await nextTick()
		expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(['Documents', 'Historie'])
	})

	it('has no overflow menu and no tab icons', async () => {
		const w = mountWidget('board', content)
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-more"]').exists()).toBe(false)
		expect(w.find('.cn-tabs-widget__title-icon').exists()).toBe(false)
	})

	it('names the tab list from the page and draws Actions as a secondary button', async () => {
		const w = mountWidget('board', content, { cnDetailTabsLabel: { value: 'Case parts' } })
		await nextTick()
		expect(w.find('[role="tablist"]').attributes('aria-label')).toBe('Case parts')
		expect(w.findComponent(CnActionsMenu).props('variant')).toBe('secondary')
	})

	it('lets the widget content name the list over the page', async () => {
		const w = mountWidget('board', { ...content, ariaLabel: 'My parts' }, { cnDetailTabsLabel: { value: 'Case parts' } })
		await nextTick()
		expect(w.find('[role="tablist"]').attributes('aria-label')).toBe('My parts')
	})

	it('keeps the order, the icons and the overflow menu without the look', async () => {
		const w = mountWidget(null, content)
		await nextTick()
		expect(w.findAll('[role="tab"]').map((t) => t.text())[0]).toBe('Documents')
		expect(w.findAll('[role="tab"]').map((t) => t.text())).not.toContain('History')
		expect(w.find('.cn-tabs-widget__title-icon').exists()).toBe(true)
		expect(w.find('[data-testid="cn-tabs-more"]').exists()).toBe(true)
		expect(w.find('[role="tablist"]').attributes('aria-label')).toBe('Details')
	})
})

describe('CnDetailPage tabsLabel', () => {
	it('provides the page label, or "<type> parts", to the tabs below it', () => {
		const store = { objects: {}, schemas: {}, registerObjectType: jest.fn(), fetchObject: jest.fn(async () => null), fetchSchema: jest.fn(async () => null) }
		const make = (props) => mount(CnDetailPage, {
			props: { title: 'Case', register: 'r', schema: 's', objectId: 'o1', objectStore: store, ...props },
			global: { provide: provideBoard, stubs: { CnDashboardGrid: { template: '<div />' } } },
		})
		expect(make({}).vm.resolvedTabsLabel).toBe('Case parts')
		expect(make({ tabsLabel: 'Parts of the case' }).vm.resolvedTabsLabel).toBe('Parts of the case')
	})
})

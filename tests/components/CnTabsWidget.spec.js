/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTabsWidget — a widget that holds other widgets, one per tab.
 *
 * The behaviours under test are the ones that make it a TABS WIDGET rather than
 * a tab strip with widgets in it: the children give up their own card chrome to
 * the strip, and the Actions menu is hoisted out of the panels into the bar
 * where it rebinds to whichever child is showing.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-notes', type: 'object-list', title: 'Notes', icon: 'NoteTextOutline', content: { register: 'r', schema: 's' } },
	{ id: 'w-files', type: 'object-list', title: 'Files and attachments', content: { register: 'r', schema: 's' } },
	{ id: 'w-subs', type: 'object-list', title: 'Sub-cases', content: { register: 'r', schema: 's' } },
]

function mountWidget(content, extra = {}) {
	return mount(CnTabsWidget, {
		props: {
			content,
			availableWidgets: WIDGETS,
			objectId: 'obj-1',
			register: 'dossiq',
			schema: 'case',
			...extra,
		},
		global: {
			stubs: {
				CnDetailWidgetHost: {
					name: 'CnDetailWidgetHost',
					props: ['widget', 'chrome', 'objectId'],
					template: '<div class="host">{{ widget.id }}|{{ chrome }}|{{ objectId }}</div>',
				},
			},
		},
	})
}

describe('CnTabsWidget', () => {
	it('renders one tab per configured entry, in the configured order', async () => {
		const w = mountWidget({ tabs: [{ widgetId: 'w-files' }, { widgetId: 'w-notes' }] })
		await nextTick()

		const tabs = w.findAll('[role="tab"]')
		expect(tabs).toHaveLength(2)
		expect(tabs[0].text()).toContain('Files and attachments')
		expect(tabs[1].text()).toContain('Notes')
	})

	it('falls back to the child widget’s own title when the tab declares none', async () => {
		const w = mountWidget({ tabs: [{ widgetId: 'w-subs' }] })
		await nextTick()

		expect(w.find('[role="tab"]').text()).toContain('Sub-cases')
	})

	it('lets a configured label override the child’s title', async () => {
		// The whole reason tab titles are configurable: "Files and attachments"
		// is fine on a card and too long once six tabs share the width.
		const w = mountWidget({ tabs: [{ widgetId: 'w-files', label: 'Files' }] })
		await nextTick()

		const text = w.find('[role="tab"]').text()
		expect(text).toContain('Files')
		expect(text).not.toContain('attachments')
	})

	it('renders its children BARE, so the strip owns the title and the card', async () => {
		const w = mountWidget({ tabs: [{ widgetId: 'w-notes' }] })
		await nextTick()

		expect(w.find('.host').text()).toBe('w-notes|bare|obj-1')
	})

	describe('the hoisted Actions menu', () => {
		it('sits in the tab bar, outside the tablist', async () => {
			const w = mountWidget({ tabs: [{ widgetId: 'w-notes' }, { widgetId: 'w-files' }] })
			await nextTick()

			expect(w.find('.cn-tabs__nav-end').exists()).toBe(true)
			// Anything inside role="tablist" is announced as a tab.
			expect(w.find('[role="tablist"]').find('.cn-tabs__nav-end').exists()).toBe(false)
		})

		it('binds to the active child, and rebinds when the tab changes', async () => {
			// This is what makes ONE menu correct for six widgets: Refresh reaches
			// the showing child's fetch over cn:widget:refresh, not a sibling's.
			const w = mountWidget({ tabs: [{ widgetId: 'w-notes' }, { widgetId: 'w-files' }] })
			await nextTick()

			expect(w.vm.activeWidgetId).toBe('w-notes')
			expect(w.vm.activeTitle).toBe('Notes')

			await w.findAll('[role="tab"]')[1].trigger('click')
			await nextTick()

			expect(w.vm.activeWidgetId).toBe('w-files')
			expect(w.vm.activeTitle).toBe('Files and attachments')
		})

		it('follows keyboard navigation too, not just clicks', async () => {
			const w = mountWidget({ tabs: [{ widgetId: 'w-notes' }, { widgetId: 'w-files' }] })
			await nextTick()

			await w.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
			await nextTick()

			expect(w.vm.activeWidgetId).toBe('w-files')
		})
	})

	describe('panels are lazy', () => {
		it('mounts only the open tab’s child on first paint', async () => {
			// Six eager panels that each fetch on mounted() fire six requests to
			// answer five questions nobody asked.
			const w = mountWidget({ tabs: [{ widgetId: 'w-notes' }, { widgetId: 'w-files' }] })
			await nextTick()

			expect(w.findAll('.host')).toHaveLength(1)
			expect(w.find('.host').text()).toContain('w-notes')
		})

		it('keeps a child mounted after switching away, so it never refetches', async () => {
			const w = mountWidget({ tabs: [{ widgetId: 'w-notes' }, { widgetId: 'w-files' }] })
			await nextTick()

			await w.findAll('[role="tab"]')[1].trigger('click')
			await nextTick()
			expect(w.findAll('.host')).toHaveLength(2)

			await w.findAll('[role="tab"]')[0].trigger('click')
			await nextTick()
			expect(w.findAll('.host')).toHaveLength(2)
		})
	})

	describe('a tab naming a widget that does not exist', () => {
		it('still renders the tab and says which id did not resolve', async () => {
			// content.tabs[] is hand-authored config. A typo that silently drops
			// the tab is a typo nobody finds.
			const w = mountWidget({ tabs: [{ widgetId: 'w-typo', label: 'Oops' }] })
			await nextTick()

			expect(w.findAll('[role="tab"]')).toHaveLength(1)
			expect(w.findAll('.host')).toHaveLength(0)
			// NcEmptyContent is globally stubbed here, so assert the message we
			// hand it rather than text the stub never renders.
			expect(w.vm.missingLabel({ widgetId: 'w-typo' })).toContain('w-typo')
		})
	})

	it('renders no tabs when none are configured', async () => {
		const w = mountWidget({})
		await nextTick()

		expect(w.findAll('[role="tab"]')).toHaveLength(0)
	})

	it('accepts a bare widget id string as a tab entry', async () => {
		const w = mountWidget({ tabs: ['w-notes'] })
		await nextTick()

		expect(w.find('[role="tab"]').text()).toContain('Notes')
	})
})

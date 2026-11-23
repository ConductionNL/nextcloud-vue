/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnTabs `variant="segmented"`: another look, the same tab semantics.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-segmented-control
 */

import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import CnTab from '../../src/components/CnTabs/CnTab.vue'
import CnTabs from '../../src/components/CnTabs/CnTabs.vue'

/**
 * Mount a two-tab strip. Tabs register on mount, so the nav renders a tick later.
 *
 * @param {object} stripProps Props for CnTabs.
 * @return {Promise<object>} The wrapper.
 */
async function mountStrip(stripProps = {}) {
	const wrapper = mount(defineComponent({
		render() {
			return h(CnTabs, stripProps, {
				default: () => ['My work', 'My team'].map((title, i) => h(CnTab, { title, key: i }, { default: () => `panel ${i}` })),
			})
		},
	}), { attachTo: document.body })
	await nextTick()
	return wrapper
}

describe('CnTabs segmented variant', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('draws the line variant by default', async () => {
		wrapper = await mountStrip()
		expect(wrapper.find('.cn-tabs').classes()).not.toContain('cn-tabs--segmented')
	})

	it('adds the segmented class and keeps the tablist, tab and panel wiring', async () => {
		wrapper = await mountStrip({ variant: 'segmented', ariaLabel: 'View' })
		expect(wrapper.find('.cn-tabs').classes()).toContain('cn-tabs--segmented')
		const tablist = wrapper.find('[role="tablist"]')
		expect(tablist.attributes('aria-label')).toBe('View')
		const tabs = wrapper.findAll('[role="tab"]')
		expect(tabs).toHaveLength(2)
		expect(tabs.map((tab) => tab.attributes('aria-selected'))).toEqual(['true', 'false'])
		expect(tabs.map((tab) => tab.attributes('tabindex'))).toEqual(['0', '-1'])
		expect(wrapper.find(`#${tabs[0].attributes('aria-controls')}`).exists()).toBe(true)
	})

	it('still moves the selection with the arrow keys', async () => {
		wrapper = await mountStrip({ variant: 'segmented' })
		const tabs = wrapper.findAll('[role="tab"]')
		tabs[0].element.focus()
		await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
		await nextTick()
		expect(wrapper.findAll('[role="tab"]').map((tab) => tab.attributes('aria-selected'))).toEqual(['false', 'true'])
	})

	it('rejects an unknown variant', () => {
		expect(CnTabs.props.variant.validator('segmented')).toBe(true)
		expect(CnTabs.props.variant.validator('pills')).toBe(false)
	})
})

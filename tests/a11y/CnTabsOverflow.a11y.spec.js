/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for tab counts and the "More" menu on `CnTabs`.
 *
 * The risk this guards: a tab that lives in a menu has no `role="tab"`
 * element, so its panel would be labelled by an id that is not in the
 * document. The strip avoids that by showing a picked overflow tab in the
 * strip while it is selected; the assertions below hold it to that.
 */

const { defineComponent, h, nextTick } = require('vue')
const CnTab = require('../../src/components/CnTabs/CnTab.vue').default
const CnTabs = require('../../src/components/CnTabs/CnTabs.vue').default
const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')

const tabs = [
	{ title: 'Overview' },
	{ title: 'Documents', count: 5 },
	{ title: 'Archiving', overflow: true },
	{ title: 'Fees', overflow: true, count: 0 },
]

/**
 * @return {Promise<object>} The mounted strip, with its tabs registered.
 */
async function mountStrip() {
	const wrapper = mountAttached(defineComponent({
		render() {
			return h(CnTabs, { ariaLabel: 'Case details' }, {
				default: () => tabs.map((t, i) => h(CnTab, { ...t, key: i }, { default: () => `Panel ${i}` })),
			})
		},
	}))
	await nextTick()
	return wrapper
}

describe('CnTabs counts and More menu: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations with counts and overflow tabs', async () => {
		wrapper = await mountStrip()
		await expectAccessible(wrapper)
	})

	it('keeps the menu button out of the tablist and gives it a name', async () => {
		wrapper = await mountStrip()
		const tablist = wrapper.element.querySelector('[role="tablist"]')
		const more = wrapper.element.querySelector('.cn-tabs__more button')
		expect(more).not.toBeNull()
		expect(tablist.contains(more)).toBe(false)
		expect((more.getAttribute('aria-label') || more.textContent).trim()).not.toBe('')
		expect(more.getAttribute('tabindex')).not.toBe('-1')
	})

	it('puts the count in the tab\'s own name, separated by a space', async () => {
		wrapper = await mountStrip()
		const names = [...wrapper.element.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent.replace(/\s+/g, ' ').trim())
		expect(names).toEqual(['Overview', 'Documents 5'])
	})

	it('labels every panel that is showing by a tab that exists', async () => {
		wrapper = await mountStrip()
		const showing = [...wrapper.element.querySelectorAll('[role="tabpanel"]')].filter((panel) => !panel.hidden)
		expect(showing).toHaveLength(1)
		for (const panel of showing) {
			expect(document.getElementById(panel.getAttribute('aria-labelledby'))).not.toBeNull()
		}
	})
})

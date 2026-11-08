/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The tab strip of CnTabbedFormDialog answers the keyboard as a WAI-ARIA tab
 * list: arrows move between tabs and wrap, Home and End jump to the ends, a
 * disabled tab is skipped, the new tab takes the focus, and only the active
 * tab is in the Tab order.
 */
import { mount } from '@vue/test-utils'
import CnTabbedFormDialog from '../../src/components/CnTabbedFormDialog/CnTabbedFormDialog.vue'

const TABS = [
	{ id: 'settings', title: 'Settings' },
	{ id: 'quota', title: 'Quota' },
	{ id: 'locked', title: 'Locked', disabled: true },
	{ id: 'security', title: 'Security' },
]

/**
 * Mount the dialog with the four tabs, attached so focus can be read.
 *
 * @return {object} The wrapper
 */
function mountDialog() {
	return mount(CnTabbedFormDialog, { props: { tabs: TABS, item: null }, attachTo: document.body })
}

const tabButtons = (wrapper) => wrapper.findAll('[role="tab"]')
const activeTitle = (wrapper) => tabButtons(wrapper).find((b) => b.attributes('aria-selected') === 'true').text()

/**
 * Press a key on the tab strip.
 *
 * @param {object} wrapper The wrapper
 * @param {string} key The key
 * @return {Promise<void>}
 */
async function press(wrapper, key) {
	await wrapper.find('[role="tablist"]').trigger('keydown', { key })
	await wrapper.vm.$nextTick()
}

describe('CnTabbedFormDialog keyboard navigation', () => {
	let wrapper
	afterEach(() => wrapper.unmount())

	it('only the active tab is in the Tab order', async () => {
		wrapper = mountDialog()
		expect(tabButtons(wrapper).map((b) => b.attributes('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
		await press(wrapper, 'ArrowRight')
		expect(tabButtons(wrapper).map((b) => b.attributes('tabindex'))).toEqual(['-1', '0', '-1', '-1'])
	})

	it('ArrowRight moves to the next tab, skips a disabled tab and wraps around', async () => {
		wrapper = mountDialog()
		await press(wrapper, 'ArrowRight')
		expect(activeTitle(wrapper)).toBe('Quota')
		await press(wrapper, 'ArrowRight')
		expect(activeTitle(wrapper)).toBe('Security')
		await press(wrapper, 'ArrowRight')
		expect(activeTitle(wrapper)).toBe('Settings')
	})

	it('ArrowLeft moves to the previous tab and wraps around', async () => {
		wrapper = mountDialog()
		await press(wrapper, 'ArrowLeft')
		expect(activeTitle(wrapper)).toBe('Security')
		await press(wrapper, 'ArrowLeft')
		expect(activeTitle(wrapper)).toBe('Quota')
	})

	it('Home and End jump to the first and last enabled tab', async () => {
		wrapper = mountDialog()
		await press(wrapper, 'End')
		expect(activeTitle(wrapper)).toBe('Security')
		await press(wrapper, 'Home')
		expect(activeTitle(wrapper)).toBe('Settings')
	})

	it('the tab that becomes active takes the focus and is announced', async () => {
		wrapper = mountDialog()
		await press(wrapper, 'ArrowRight')
		expect(document.activeElement.textContent.trim()).toBe('Quota')
		expect(wrapper.emitted('update:activeTab')).toEqual([[1]])
	})

	it('other keys are left alone', async () => {
		wrapper = mountDialog()
		const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true })
		wrapper.find('[role="tablist"]').element.dispatchEvent(event)
		await wrapper.vm.$nextTick()
		expect(event.defaultPrevented).toBe(false)
		expect(activeTitle(wrapper)).toBe('Settings')
		expect(wrapper.emitted('update:activeTab')).toBeUndefined()
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMenuWidget dropdown keyboard: Enter opens and focuses the first item, Esc
 * returns focus to the top-level button, Tab from the last item closes the
 * dropdown and moves to the next top-level item.
 */
import { mount } from '@vue/test-utils'
import CnMenuWidget from '@/components/CnMenuWidget/CnMenuWidget.vue'

const ITEMS = [
	{ label: 'Alpha', url: '', icon: '', children: [{ label: 'Alpha one', url: '/a1', icon: '', children: [] }, { label: 'Alpha two', url: '/a2', icon: '', children: [] }] },
	{ label: 'Beta', url: '', icon: '', children: [{ label: 'Beta one', url: '/b1', icon: '', children: [] }] },
]

/**
 * Mount the widget attached to the document so focus works.
 *
 * @return {object} The wrapper.
 */
function mountMenu() {
	return mount(CnMenuWidget, {
		attachTo: document.body,
		propsData: { content: { style: 'dropdown', items: ITEMS } },
	})
}

/**
 * The top-level button with this label.
 *
 * @param {object} wrapper The wrapper.
 * @param {string} label The label.
 * @return {object} The button wrapper.
 */
function top(wrapper, label) {
	return wrapper.findAll('.cn-menu-widget__bar-button').find((b) => b.text().includes(label))
}

/**
 * The dropdown items currently rendered.
 *
 * @param {object} wrapper The wrapper.
 * @return {object[]} The item wrappers.
 */
function dropItems(wrapper) {
	return wrapper.findAll('.cn-menu-widget__dropdown .cn-menu-widget__dropdown-item')
}

describe('CnMenuWidget dropdown keyboard', () => {
	let wrapper
	afterEach(() => {
		wrapper.unmount()
	})

	it('Enter opens the dropdown and focuses its first item', async () => {
		wrapper = mountMenu()
		await top(wrapper, 'Alpha').trigger('keydown', { key: 'Enter' })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(dropItems(wrapper).length).toBe(2)
		expect(document.activeElement).toBe(dropItems(wrapper)[0].element)
	})

	it('Esc closes the dropdown and focuses its top-level button', async () => {
		wrapper = mountMenu()
		await top(wrapper, 'Alpha').trigger('click')
		const child = dropItems(wrapper)[0]
		child.element.focus()
		await child.trigger('keydown', { key: 'Escape' })
		expect(dropItems(wrapper).length).toBe(0)
		expect(document.activeElement).toBe(top(wrapper, 'Alpha').element)
	})

	it('Tab from the last item closes the dropdown and focuses the next top-level item', async () => {
		wrapper = mountMenu()
		await top(wrapper, 'Alpha').trigger('click')
		const last = dropItems(wrapper)[1]
		last.element.focus()
		await last.trigger('keydown', { key: 'Tab' })
		expect(dropItems(wrapper).length).toBe(0)
		expect(document.activeElement).toBe(top(wrapper, 'Beta').element)
	})

	it('Tab from an earlier item keeps the dropdown open', async () => {
		wrapper = mountMenu()
		await top(wrapper, 'Alpha').trigger('click')
		await dropItems(wrapper)[0].trigger('keydown', { key: 'Tab' })
		expect(dropItems(wrapper).length).toBe(2)
	})

	it('Tab on the open button skips its dropdown to the next top-level item', async () => {
		wrapper = mountMenu()
		const alpha = top(wrapper, 'Alpha')
		await alpha.trigger('click')
		alpha.element.focus()
		await alpha.trigger('keydown', { key: 'Tab' })
		expect(dropItems(wrapper).length).toBe(0)
		expect(document.activeElement).toBe(top(wrapper, 'Beta').element)
	})
})

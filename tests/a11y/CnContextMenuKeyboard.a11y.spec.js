/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The context menu, opened from the keyboard, is a real menu.
 *
 * A flow step's Edit / Copy / Delete live in this menu. Against the stubbed
 * `@nextcloud/vue` of the main Jest project there is no menu markup to look
 * at, so this runs on the real NcActions: the popup must be `role="menu"`,
 * each action a `menuitem`, and the arrow keys must move between them.
 */

const { mountAttached } = require('./support/mountAttached.js')
const CnContextMenu = require('../../src/components/CnContextMenu/CnContextMenu.vue').default

/**
 * Wait for the popover to render and move focus.
 *
 * @return {Promise<void>}
 */
async function settle() {
	for (let i = 0; i < 10; i++) {
		await new Promise((resolve) => setTimeout(resolve, 20))
	}
}

describe('CnContextMenu — keyboard', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
		document.body.innerHTML = ''
	})

	it('opens as a menu of menuitems, and the arrows move between the items', async () => {
		wrapper = mountAttached(CnContextMenu, {
			propsData: {
				open: false,
				actions: [
					{ label: 'Edit', handler: () => {} },
					{ label: 'Copy', handler: () => {} },
					{ label: 'Delete', handler: () => {} },
				],
				targetItem: 'a',
			},
		})
		await wrapper.setProps({ open: true })
		await settle()

		const menu = document.querySelector('[role="menu"]')
		expect(menu).not.toBeNull()
		const items = [...menu.querySelectorAll('[role="menuitem"]')]
		expect(items.map((el) => el.textContent.trim())).toEqual(['Edit', 'Copy', 'Delete'])

		// Focus on open is the popover's after-show hook, which needs a real
		// layout; the browser check covers it. The arrows are NcActions' own.
		items[0].focus()
		items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		await settle()
		expect(document.activeElement).toBe(items[1])
	})
})

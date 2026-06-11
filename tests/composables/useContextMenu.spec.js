/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for useContextMenu() — cursor-positioned right-click menu state.
 *
 * Covers the open/close DOM contract (CSS vars + data attribute), action
 * disablement, handler invocation, and unmount cleanup. These guarantees back
 * the shared `src/css/context-menu.css` override that targets the data
 * attribute — if the attribute or the CSS vars regress the popper snaps back
 * to (0,0) instead of following the cursor.
 */

import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import {
	useContextMenu,
	clearContextMenuPositionDom,
	CTX_MENU_CSS_VAR_X,
	CTX_MENU_CSS_VAR_Y,
	CTX_MENU_DATA_ATTR,
} from '../../src/composables/useContextMenu.js'

function readPosition() {
	return {
		x: document.documentElement.style.getPropertyValue(CTX_MENU_CSS_VAR_X),
		y: document.documentElement.style.getPropertyValue(CTX_MENU_CSS_VAR_Y),
		attr: document.documentElement.hasAttribute(CTX_MENU_DATA_ATTR),
	}
}

afterEach(() => {
	clearContextMenuPositionDom()
})

describe('useContextMenu', () => {
	it('initialises closed with no target item', () => {
		const ctx = useContextMenu()
		expect(ctx.isOpen.value).toBe(false)
		expect(ctx.targetItem.value).toBeNull()
	})

	it('open() writes both CSS vars + the data attribute and stores the item', () => {
		const ctx = useContextMenu()
		const item = { id: 42 }
		ctx.open({ item, event: { clientX: 120, clientY: 240 } })

		expect(ctx.isOpen.value).toBe(true)
		expect(ctx.targetItem.value).toBe(item)
		const dom = readPosition()
		expect(dom.x).toBe('120px')
		expect(dom.y).toBe('240px')
		expect(dom.attr).toBe(true)
	})

	it('close() flips reactive state but leaves DOM cleanup to the @closed handler', () => {
		const ctx = useContextMenu()
		ctx.open({ item: { id: 1 }, event: { clientX: 10, clientY: 20 } })
		ctx.close()

		expect(ctx.isOpen.value).toBe(false)
		expect(ctx.targetItem.value).toBeNull()
		// DOM must NOT be cleared synchronously — that's the consumer's @closed handler.
		const dom = readPosition()
		expect(dom.attr).toBe(true)
		expect(dom.x).toBe('10px')
	})

	it('clearContextMenuPositionDom() removes both CSS vars + the data attribute', () => {
		const ctx = useContextMenu()
		ctx.open({ item: null, event: { clientX: 5, clientY: 6 } })

		clearContextMenuPositionDom()

		const dom = readPosition()
		expect(dom.x).toBe('')
		expect(dom.y).toBe('')
		expect(dom.attr).toBe(false)
	})

	it('isActionDisabled() supports static boolean + function predicate', () => {
		const ctx = useContextMenu()
		ctx.open({ item: { archived: true }, event: { clientX: 0, clientY: 0 } })

		expect(ctx.isActionDisabled({ disabled: true })).toBe(true)
		expect(ctx.isActionDisabled({ disabled: false })).toBe(false)
		expect(ctx.isActionDisabled({})).toBe(false)
		expect(ctx.isActionDisabled({ disabled: (it) => it.archived })).toBe(true)
		expect(ctx.isActionDisabled({ disabled: (it) => !it.archived })).toBe(false)
	})

	it('triggerAction() calls the handler and returns an action payload', () => {
		const ctx = useContextMenu()
		const item = { id: 7 }
		ctx.open({ item, event: { clientX: 0, clientY: 0 } })

		const handler = jest.fn()
		const payload = ctx.triggerAction({ label: 'Delete', handler })

		expect(handler).toHaveBeenCalledWith(item)
		expect(payload).toEqual({ action: 'Delete', row: item })
	})

	it('triggerAction() returns the payload even when no handler is provided', () => {
		const ctx = useContextMenu()
		ctx.open({ item: { id: 9 }, event: { clientX: 0, clientY: 0 } })

		const payload = ctx.triggerAction({ label: 'Inspect' })
		expect(payload).toEqual({ action: 'Inspect', row: { id: 9 } })
	})

	it('unmounting the host component clears the DOM position', () => {
		let ctx
		const Host = defineComponent({
			setup() {
				ctx = useContextMenu()
				return () => h('div')
			},
		})

		const wrapper = mount(Host)
		ctx.open({ item: { id: 1 }, event: { clientX: 50, clientY: 60 } })

		expect(readPosition().attr).toBe(true)

		// VTU 1.x (Vue 2 compat) — `destroy()`; VTU 2.x — `unmount()`.
		;(wrapper.unmount || wrapper.destroy).call(wrapper)
		const dom = readPosition()
		expect(dom.x).toBe('')
		expect(dom.y).toBe('')
		expect(dom.attr).toBe(false)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDashboardGrid — keyboard operation (WCAG 2.1 SC 2.1.1).
 *
 * GridStack's drag/resize is pointer-only. These specs pin the keyboard
 * equivalent the library owns: grid items are named ARIA groups, they are
 * tab stops in edit mode, the arrow keys move/resize them, and — crucially —
 * a keyboard nudge lands in `layout-change` through the SAME
 * `GridStack.update()` call a drag ends in, so there is exactly one
 * persistence path rather than a keyboard-only fork that drifts.
 *
 * `tests/__mocks__/gridstack.js` emulates that one behaviour of the real
 * engine (update -> gs-* attributes -> `change` event); see its docblock.
 */

import { mount } from '@vue/test-utils'
import CnDashboardGrid from '@/components/CnDashboardGrid/CnDashboardGrid.vue'

const layout = () => [
	{ id: 'a', title: 'Open tickets', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 },
	{ id: 'b', title: 'Revenue', gridX: 4, gridY: 0, gridWidth: 4, gridHeight: 2 },
]

/**
 * Mount the grid with a slot child so "focus is inside the widget" cases
 * are reachable.
 *
 * @param {object} [props] Extra props merged over the defaults.
 * @return {object} The Vue Test Utils wrapper.
 */
const mountGrid = (props = {}) => mount(CnDashboardGrid, {
	propsData: { layout: layout(), editable: true, columns: 12, minWidth: 2, minHeight: 2, ...props },
	slots: {
		widget: '<div class="slot-root"><button class="inner">go</button></div>',
	},
})

const items = wrapper => wrapper.findAll('.grid-stack-item')

describe('CnDashboardGrid — grid items are named, focusable groups', () => {
	it('exposes role=group, tabindex=0 and an accessible name in edit mode', () => {
		const wrapper = mountGrid()
		const first = items(wrapper).at(0)

		expect(first.attributes('role')).toBe('group')
		expect(first.attributes('tabindex')).toBe('0')
		expect((first.attributes('aria-label') || '').trim().length).toBeGreaterThan(0)
		expect(first.attributes('aria-label')).toContain('Open tickets')
	})

	it('names the item with its grid coordinates so a screen reader knows where it sits', () => {
		const wrapper = mountGrid()
		const second = items(wrapper).at(1)

		// gridX 4 / gridY 0 are reported one-based.
		expect(second.attributes('aria-label')).toContain('column 5')
		expect(second.attributes('aria-label')).toContain('row 1')
	})

	it('drops the tab stop (but keeps the group role) outside edit mode', () => {
		const wrapper = mountGrid({ editable: false })
		const first = items(wrapper).at(0)

		expect(first.attributes('role')).toBe('group')
		expect(first.attributes('tabindex')).toBeUndefined()
		expect(first.attributes('aria-label')).toBe('Open tickets')
		expect(first.attributes('aria-describedby')).toBeUndefined()
	})

	it('drops the tab stop when keyboard repositioning is switched off', () => {
		const wrapper = mountGrid({ keyboardRepositioning: false })
		expect(items(wrapper).at(0).attributes('tabindex')).toBeUndefined()
	})

	it('points aria-describedby at a rendered key-map element (no dangling reference)', () => {
		const wrapper = mountGrid()
		const describedBy = items(wrapper).at(0).attributes('aria-describedby')

		expect(describedBy).toBeTruthy()
		const help = wrapper.find(`#${describedBy}`)
		expect(help.exists()).toBe(true)
		expect(help.text()).toContain('arrow keys')
	})

	it('falls back through title -> name -> widgetId -> positional name', () => {
		const wrapper = mount(CnDashboardGrid, {
			propsData: {
				editable: true,
				layout: [
					{ id: '1', name: 'Named', gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 2 },
					{ id: '2', widgetId: 'weather', gridX: 2, gridY: 0, gridWidth: 2, gridHeight: 2 },
					{ id: '3', gridX: 4, gridY: 0, gridWidth: 2, gridHeight: 2 },
				],
			},
		})
		const labels = [0, 1, 2].map(i => items(wrapper).at(i).attributes('aria-label'))

		expect(labels[0]).toContain('Named')
		expect(labels[1]).toContain('weather')
		expect(labels[2]).toContain('Widget 3')
	})

	it('uses a custom itemLabel verbatim', () => {
		const wrapper = mountGrid({ itemLabel: item => `Card ${item.id}` })
		expect(items(wrapper).at(0).attributes('aria-label')).toBe('Card a')
	})
})

describe('CnDashboardGrid — keyboard repositioning', () => {
	it('ArrowRight moves the widget one column and emits layout-change via GridStack.update', async () => {
		const wrapper = mountGrid()
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowRight' })

		expect(wrapper.vm.grid.update).toHaveBeenCalledTimes(1)
		expect(wrapper.vm.grid.update.mock.calls[0][1]).toEqual({ x: 1, y: 0, w: 4, h: 2 })

		const emitted = wrapper.emitted('layout-change')
		expect(emitted).toHaveLength(1)
		expect(emitted[0][0][0]).toMatchObject({ id: 'a', gridX: 1, gridY: 0 })
		// The untouched sibling is carried through unchanged.
		expect(emitted[0][0][1]).toMatchObject({ id: 'b', gridX: 4 })
	})

	it('ArrowDown moves one row down', async () => {
		const wrapper = mountGrid()
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowDown' })

		expect(wrapper.emitted('layout-change')[0][0][0]).toMatchObject({ gridY: 1 })
	})

	it('clamps at the left edge instead of emitting a negative column', async () => {
		const wrapper = mountGrid()
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowLeft' })

		expect(wrapper.vm.grid.update).not.toHaveBeenCalled()
		expect(wrapper.emitted('layout-change')).toBeUndefined()
	})

	it('clamps at the right edge', async () => {
		const wrapper = mountGrid({ layout: [{ id: 'a', title: 'T', gridX: 8, gridY: 0, gridWidth: 4, gridHeight: 2 }] })
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowRight' })

		expect(wrapper.emitted('layout-change')).toBeUndefined()
	})

	it('End jumps to the last column, Home back to the first', async () => {
		const wrapper = mountGrid()
		await items(wrapper).at(0).trigger('keydown', { key: 'End' })
		expect(wrapper.emitted('layout-change')[0][0][0]).toMatchObject({ gridX: 8 })

		await items(wrapper).at(1).trigger('keydown', { key: 'Home' })
		expect(wrapper.emitted('layout-change')[1][0][1]).toMatchObject({ id: 'b', gridX: 0 })
	})

	it('Shift+Arrow resizes rather than moves', async () => {
		const wrapper = mountGrid()
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowRight', shiftKey: true })
		expect(wrapper.emitted('layout-change')[0][0][0]).toMatchObject({ gridWidth: 5, gridX: 0 })

		await items(wrapper).at(1).trigger('keydown', { key: 'ArrowDown', shiftKey: true })
		expect(wrapper.emitted('layout-change')[1][0][1]).toMatchObject({ id: 'b', gridHeight: 3 })
	})

	it('Shift+Arrow never shrinks below minWidth / minHeight', async () => {
		const wrapper = mountGrid({ layout: [{ id: 'a', title: 'T', gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 2 }] })

		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowUp', shiftKey: true })

		expect(wrapper.emitted('layout-change')).toBeUndefined()
	})

	it('respects the live column count when clamping', async () => {
		const wrapper = mountGrid({ columns: 6, layout: [{ id: 'a', title: 'T', gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 2 }] })
		await items(wrapper).at(0).trigger('keydown', { key: 'End' })

		expect(wrapper.emitted('layout-change')[0][0][0]).toMatchObject({ gridX: 4 })
	})

	it('ignores repositioning keys outside edit mode', async () => {
		const wrapper = mountGrid({ editable: false })
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowRight' })

		expect(wrapper.vm.grid.update).not.toHaveBeenCalled()
	})

	it('ignores repositioning keys when keyboardRepositioning is off', async () => {
		const wrapper = mountGrid({ keyboardRepositioning: false })
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowRight' })

		expect(wrapper.vm.grid.update).not.toHaveBeenCalled()
	})

	it('never steals keys from interactive content inside the widget slot', async () => {
		const wrapper = mountGrid()
		await wrapper.find('.inner').trigger('keydown', { key: 'ArrowRight' })
		await wrapper.find('.inner').trigger('keydown', { key: 'Enter' })

		expect(wrapper.vm.grid.update).not.toHaveBeenCalled()
		expect(wrapper.emitted('item-activate')).toBeUndefined()
	})

	it('leaves browser/OS chords (Ctrl, Alt, Meta) alone', async () => {
		const wrapper = mountGrid()
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowRight', ctrlKey: true })
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowRight', metaKey: true })

		expect(wrapper.vm.grid.update).not.toHaveBeenCalled()
	})

	it('announces the new position in the polite live region', async () => {
		const wrapper = mountGrid()
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowRight' })
		await wrapper.vm.$nextTick()

		const status = wrapper.find('[role="status"]')
		expect(status.attributes('aria-live')).toBe('polite')
		expect(status.text()).toContain('Open tickets')
		expect(status.text()).toContain('column 2')
	})

	it('announces that a widget cannot move further at the edge', async () => {
		const wrapper = mountGrid()
		await items(wrapper).at(0).trigger('keydown', { key: 'ArrowLeft' })
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[role="status"]').text()).toContain('cannot move further')
	})
})

describe('CnDashboardGrid — keyboard activation', () => {
	it('Enter emits item-activate with the item, element and anchor coordinates', async () => {
		const wrapper = mountGrid()
		await items(wrapper).at(1).trigger('keydown', { key: 'Enter' })

		const payload = wrapper.emitted('item-activate')[0][0]
		expect(payload.item).toMatchObject({ id: 'b' })
		expect(payload.element).toBe(items(wrapper).at(1).element)
		expect(typeof payload.clientX).toBe('number')
		expect(typeof payload.clientY).toBe('number')
	})

	it('Space activates too', async () => {
		const wrapper = mountGrid()
		await items(wrapper).at(0).trigger('keydown', { key: ' ' })

		expect(wrapper.emitted('item-activate')).toHaveLength(1)
	})

	it('dispatches a bubbling contextmenu from inside the item so pointer menus become keyboard-reachable', async () => {
		const wrapper = mountGrid()
		const seen = []
		wrapper.find('.slot-root').element.addEventListener('contextmenu', e => seen.push(e))

		await items(wrapper).at(0).trigger('keydown', { key: 'Enter' })

		expect(seen).toHaveLength(1)
		expect(seen[0].bubbles).toBe(true)
		expect(seen[0].cancelable).toBe(true)
	})

	it('skips the synthetic contextmenu when activateOpensContextMenu is false', async () => {
		const wrapper = mountGrid({ activateOpensContextMenu: false })
		const seen = []
		wrapper.find('.slot-root').element.addEventListener('contextmenu', e => seen.push(e))

		await items(wrapper).at(0).trigger('keydown', { key: 'Enter' })

		expect(seen).toHaveLength(0)
		expect(wrapper.emitted('item-activate')).toHaveLength(1)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The split pane keeps the list alive.
 *
 * Every assertion here is about something NOT happening: the list not
 * unmounting, the scroll not resetting, the page not refetching. That is the
 * shape of this feature, and it is also why the tests read the element
 * identity and the call counts rather than the rendered output. A split view
 * that unmounted its list would still render a list and a record, and would
 * still look right in a screenshot.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import { shallowMount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const ROWS = [
	{ id: '1', title: 'One', status: 'open' },
	{ id: '2', title: 'Two', status: 'open' },
	{ id: '3', title: 'Three', status: 'open' },
]

/**
 * Mount the page with a split view declared, at a given viewport width.
 *
 * @param {object} [props] Props to merge in.
 * @param {number} [width] The viewport width to report.
 * @return {object} The wrapper.
 */
function mountPage(props = {}, width = 1600) {
	window.innerWidth = width
	return shallowMount(CnIndexPage, {
		props: {
			title: 'Cases',
			objects: ROWS,
			subscribe: false,
			splitView: { enabled: true, breakpoint: 900 },
			...props,
		},
		global: {
			stubs: { teleport: true },
			mocks: {
				t: (_app, str) => str,
				$route: { name: 'cases', params: {}, query: {}, meta: { cnPageId: 'cases' } },
				$router: { push: jest.fn().mockResolvedValue(undefined) },
			},
		},
	})
}

/**
 * Make an element's `scrollTop` hold what is written to it.
 *
 * jsdom clamps `scrollTop` to 0 on an element with no layout, so reading it
 * back answers 0 whether the component wrote to it or not. Asserting on it
 * unpatched is a test that cannot fail.
 *
 * @param {HTMLElement} el The element.
 * @param {number} initial The starting value.
 * @return {HTMLElement} The same element.
 */
function writableScrollTop(el, initial) {
	Object.defineProperty(el, 'scrollTop', { value: initial, writable: true, configurable: true })
	return el
}

describe('CnIndexPage split view — the three layouts', () => {
	it('is the plain list while no record is open, with no pane in the DOM', () => {
		const w = mountPage()

		expect(w.vm.splitLayout).toBe('list')
		expect(w.find('[data-testid="cn-index-page-split-pane"]').exists()).toBe(false)
	})

	it('renders the pane beside the list when a record is open on a wide screen', () => {
		const w = mountPage({ splitId: '2' }, 1600)

		expect(w.vm.splitLayout).toBe('split')
		expect(w.find('[data-testid="cn-index-page-split-pane"]').exists()).toBe(true)
	})

	it('renders the full detail page at the same address below the breakpoint', () => {
		const w = mountPage({ splitId: '2' }, 420)

		expect(w.vm.splitLayout).toBe('detail')
		expect(w.find('[data-testid="cn-index-page-split-pane"]').attributes('data-split-layout')).toBe('detail')
	})

	it('renders exactly as today for a page that declares no split view', () => {
		const w = mountPage({ splitView: {}, splitId: '2' })

		expect(w.vm.splitLayout).toBe('list')
		expect(w.find('[data-testid="cn-index-page-split-pane"]').exists()).toBe(false)
	})

	it('follows a resize rather than waiting for a reload', async () => {
		const w = mountPage({ splitId: '2' }, 1600)
		expect(w.vm.splitLayout).toBe('split')

		window.innerWidth = 500
		window.dispatchEvent(new Event('resize'))
		await w.vm.$nextTick()

		expect(w.vm.splitLayout).toBe('detail')
	})
})

describe('CnIndexPage split view — the list stays alive', () => {
	it('keeps the very same list element when the pane opens and closes', async () => {
		const w = mountPage()
		const before = w.vm.$refs.listScroll

		await w.setProps({ splitId: '2' })
		const during = w.vm.$refs.listScroll
		await w.setProps({ splitId: '' })

		// Element identity, not "a list is rendered": a remount would also
		// render a list, and would also have thrown the scroll away.
		expect(during).toBe(before)
		expect(w.vm.$refs.listScroll).toBe(before)
	})

	it('hides the list below the breakpoint without unmounting it', async () => {
		const w = mountPage({ splitId: '2' }, 420)

		expect(w.vm.$refs.listScroll).toBeTruthy()
		expect(w.vm.$refs.listScroll.style.display).toBe('none')
	})

	it('puts the scroll position back when the narrow layout is left', async () => {
		const w = mountPage({ splitId: '2' }, 420)
		const list = writableScrollTop(w.vm.$refs.listScroll, 0)
		w.vm.splitScrollTop = 4200

		await w.vm.restoreListScroll()

		expect(list.scrollTop).toBe(4200)
	})

	it('writes nothing when the list was never scrolled, so it does not fight the browser', async () => {
		const w = mountPage({ splitId: '2' }, 420)
		const list = writableScrollTop(w.vm.$refs.listScroll, 123)
		w.vm.splitScrollTop = 0

		await w.vm.restoreListScroll()

		expect(list.scrollTop).toBe(123)
	})

	it('restores the position on the way out of the narrow layout, not on the way in', async () => {
		const w = mountPage({ splitId: '2' }, 420)
		const restore = jest.spyOn(w.vm, 'restoreListScroll').mockResolvedValue(undefined)

		window.innerWidth = 1600
		window.dispatchEvent(new Event('resize'))
		await w.vm.$nextTick()

		expect(w.vm.splitLayout).toBe('split')
		expect(restore).toHaveBeenCalled()
	})

	it('records the scroll position as the handler scrolls', () => {
		const w = mountPage()

		w.vm.onListScroll({ target: { scrollTop: 1800 } })

		expect(w.vm.splitScrollTop).toBe(1800)
	})

	it('keeps the selection across opening and closing the pane', async () => {
		const w = mountPage({ selectable: true, selectedIds: ['1', '3'] })

		await w.setProps({ splitId: '2' })
		await w.setProps({ splitId: '' })

		expect(w.vm.internalSelectedIds).toEqual(['1', '3'])
	})
})

describe('CnIndexPage split view — a save lands on the row', () => {
	it('replaces the row in place and refetches nothing', async () => {
		const w = mountPage({ splitId: '2' })

		w.vm.onSplitPaneSaved({ id: '2', title: 'Two', status: 'closed' })
		await w.vm.$nextTick()

		expect(w.vm.displayObjects.map((r) => r.status)).toEqual(['open', 'closed', 'open'])
		// The rows the page was handed are untouched: the patch is applied
		// over them, so nothing was written back into a prop or a store.
		expect(ROWS[1].status).toBe('open')
	})

	it('leaves the scroll position alone when a row is saved', () => {
		const w = mountPage({ splitId: '2' })
		w.vm.splitScrollTop = 4200

		w.vm.onSplitPaneSaved({ id: '2', status: 'closed' })

		expect(w.vm.splitScrollTop).toBe(4200)
	})

	it('tells the host what was saved', () => {
		const w = mountPage({ splitId: '2' })

		w.vm.onSplitPaneSaved({ id: '2', status: 'closed' })

		expect(w.emitted('split-saved')[0][0]).toEqual({ id: '2', status: 'closed' })
	})

	it('falls back to the open record when the save carries no id of its own', async () => {
		const w = mountPage({ splitId: '3' })

		w.vm.onSplitPaneSaved({ status: 'closed' })
		await w.vm.$nextTick()

		expect(w.vm.displayObjects[2].status).toBe('closed')
	})

	it('ignores a save that is not a record', () => {
		const w = mountPage({ splitId: '2' })

		w.vm.onSplitPaneSaved(null)

		expect(w.vm.displayObjects).toEqual(ROWS)
	})
})

describe('CnIndexPage split view — closing', () => {
	it('returns to the list address and says so', () => {
		const w = mountPage({ splitId: '2', splitCloseRoute: 'cases' })

		w.vm.closeSplitPane()

		expect(w.emitted('split-close')).toHaveLength(1)
		expect(w.vm.$router.push).toHaveBeenCalledWith({ name: 'cases', query: {} })
	})

	it('falls back to the page the route names when no close route was given', () => {
		const w = mountPage({ splitId: '2' })

		w.vm.closeSplitPane()

		expect(w.vm.$router.push).toHaveBeenCalledWith({ name: 'cases', query: {} })
	})
})

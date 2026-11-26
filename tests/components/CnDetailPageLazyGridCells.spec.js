/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page's body grid mounts a widget only once its cell comes near the
 * screen, so opening a record fetches for the cards in view and not for every
 * card below the fold. A cell in the first viewport, a widget marked
 * `eager: true` and a browser without IntersectionObserver all mount at once.
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnDetailGridCell from '../../src/components/CnDetailPage/CnDetailGridCell.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

/** IntersectionObserver double that lets a test say when a cell is near the screen. */
class FakeIntersectionObserver {
	static instances = []

	constructor(callback, options) {
		this.callback = callback
		this.options = options
		this.targets = []
		this.disconnected = false
		FakeIntersectionObserver.instances.push(this)
	}

	observe(target) {
		this.targets.push(target)
	}

	disconnect() {
		this.disconnected = true
	}

	/**
	 * Report every observed target as intersecting or not.
	 *
	 * @param {boolean} isIntersecting Whether the targets are near the screen.
	 */
	report(isIntersecting) {
		this.callback(this.targets.map((target) => ({ target, isIntersecting })), this)
	}
}

/**
 * The observer watching the cell that holds a given widget.
 *
 * @param {object} wrapper The mounted page.
 * @param {string} widgetId The widget id.
 * @return {FakeIntersectionObserver|undefined} The observer.
 */
function observerFor(wrapper, widgetId) {
	const cell = wrapper.find(`[gs-id="${widgetId}"] .cn-detail-page__grid-item`).element
	return FakeIntersectionObserver.instances.find((o) => o.targets.includes(cell))
}

const WIDGETS = [
	{ id: 'top', type: 'stat', title: 'Top' },
	{ id: 'below', type: 'stat', title: 'Below' },
	{ id: 'pinned', type: 'stat', title: 'Pinned', eager: true },
]

// 768px is jsdom's window height; 80px rows put row 20 two screens down.
const LAYOUT = [
	{ id: 'top', widgetId: 'top', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 },
	{ id: 'below', widgetId: 'below', gridX: 0, gridY: 20, gridWidth: 12, gridHeight: 4 },
	{ id: 'pinned', widgetId: 'pinned', gridX: 0, gridY: 30, gridWidth: 12, gridHeight: 4 },
	{ id: 'fit', widgetId: 'below', gridX: 0, gridY: 40, gridWidth: 12, gridHeight: 3, sizeToContent: true },
]

function mountPage() {
	return mount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			layout: LAYOUT,
			widgets: WIDGETS,
			objectStore: {
				objects: { 'reg-case': { 'id-1': { id: 'id-1', name: 'x' } } },
				schemas: {},
				objectTypeRegistry: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
		},
		global: {
			stubs: {
				CnDetailWidgetHost: {
					props: ['widget'],
					template: '<div class="host" :data-widget="widget && widget.id">{{ widget && widget.id }}</div>',
				},
			},
		},
	})
}

/**
 * The widget ids whose host is mounted, one per cell.
 *
 * @param {object} wrapper The mounted page.
 * @return {string[]} The layout ids of the cells that render their widget.
 */
function mountedCells(wrapper) {
	return wrapper.findAll('.grid-stack-item')
		.filter((cell) => cell.find('.host').exists())
		.map((cell) => cell.attributes('gs-id'))
}

describe('CnDetailPage grid cells mount when they come near the screen', () => {
	beforeEach(() => {
		FakeIntersectionObserver.instances = []
		window.IntersectionObserver = FakeIntersectionObserver
	})

	afterEach(() => {
		delete window.IntersectionObserver
	})

	it('mounts the cells in the first viewport and the eager widget, not the ones below the fold', async () => {
		const w = mountPage()
		await flushPromises()

		expect(mountedCells(w)).toEqual(['top', 'pinned'])
		expect(w.find('[gs-id="below"] .cn-detail-page__grid-item').attributes('aria-busy')).toBe('true')
	})

	it('watches a waiting cell with a margin of one viewport height', async () => {
		const w = mountPage()
		await flushPromises()

		expect(observerFor(w, 'below').options).toEqual({ rootMargin: '100% 0px' })
	})

	it('mounts a cell once the observer reports it near the screen', async () => {
		const w = mountPage()
		await flushPromises()

		observerFor(w, 'below').report(false)
		await flushPromises()
		expect(mountedCells(w)).not.toContain('below')

		observerFor(w, 'below').report(true)
		await flushPromises()
		expect(mountedCells(w)).toContain('below')
		expect(w.find('[gs-id="below"] .cn-detail-page__grid-item').attributes('aria-busy')).toBeUndefined()
	})

	it('keeps a cell mounted after it has been shown, and stops watching it', async () => {
		const w = mountPage()
		await flushPromises()

		const observer = observerFor(w, 'below')
		observer.report(true)
		await flushPromises()
		expect(observer.disconnected).toBe(true)

		observer.report(false)
		await flushPromises()
		expect(mountedCells(w)).toContain('below')
	})

	it('holds a waiting size-to-content cell at its authored rows', async () => {
		const w = mountPage()
		await flushPromises()

		expect(w.find('[gs-id="fit"] .cn-detail-page__grid-item').attributes('style')).toContain('min-height: 240px')
	})

	it('mounts every cell before the page is printed', async () => {
		const w = mountPage()
		await flushPromises()

		window.dispatchEvent(new Event('beforeprint'))
		await flushPromises()
		expect(mountedCells(w)).toEqual(['top', 'below', 'pinned', 'fit'])
	})
})

describe('CnDetailPage grid cells without IntersectionObserver', () => {
	it('mounts every cell at once', async () => {
		expect(typeof window.IntersectionObserver).toBe('undefined')
		const w = mountPage()
		await flushPromises()

		expect(mountedCells(w)).toEqual(['top', 'below', 'pinned', 'fit'])
	})
})

describe('CnDetailGridCell', () => {
	beforeEach(() => {
		FakeIntersectionObserver.instances = []
		window.IntersectionObserver = FakeIntersectionObserver
	})

	afterEach(() => {
		delete window.IntersectionObserver
	})

	it('mounts its content when `eager` turns on', async () => {
		const w = mount(CnDetailGridCell, { slots: { default: '<p class="content">x</p>' } })
		expect(w.find('.content').exists()).toBe(false)

		await w.setProps({ eager: true })
		expect(w.find('.content').exists()).toBe(true)
		expect(FakeIntersectionObserver.instances[0].disconnected).toBe(true)
	})

	it('stops watching when it unmounts before it was shown', () => {
		const w = mount(CnDetailGridCell, { slots: { default: '<p class="content">x</p>' } })
		w.unmount()
		expect(FakeIntersectionObserver.instances[0].disconnected).toBe(true)
	})
})

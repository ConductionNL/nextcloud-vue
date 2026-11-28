import { mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-3
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import CnWidgetPlaceholder, { placeholderCapacity } from '../CnWidgetPlaceholder.vue'

/**
 * Mount with a measured container of the given size.
 *
 * @param {object} props The props.
 * @param {number} width Container width.
 * @param {number} height Container height.
 * @return {object} The wrapper.
 */
function mountSized(props, width = 0, height = 0) {
	const wrapper = mount(CnWidgetPlaceholder, { props })
	const root = wrapper.vm.$refs.root
	if (root) {
		Object.defineProperty(root, 'clientWidth', { configurable: true, value: width })
		Object.defineProperty(root, 'clientHeight', { configurable: true, value: height })
		wrapper.vm.measure()
	}
	return wrapper
}

describe('CnWidgetPlaceholder', () => {
	it('rows fill a 220 px content area with 5 rows of an icon and two lines, hidden from assistive technology', async () => {
		const wrapper = mountSized({ shape: 'rows' }, 300, 220)
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-widget-placeholder__row')
		expect(rows).toHaveLength(5)
		expect(rows[0].findAll('.cn-widget-placeholder__icon')).toHaveLength(1)
		expect(rows[0].findAll('.cn-widget-placeholder__line')).toHaveLength(2)
		expect(wrapper.attributes('aria-hidden')).toBe('true')
		expect(wrapper.attributes('data-shape')).toBe('rows')
	})

	it('a count is clipped to the space: 12 rows in 132 px draw 3', async () => {
		const wrapper = mountSized({ shape: 'rows', count: 12 }, 300, 132)
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-widget-placeholder__row')).toHaveLength(3)
	})

	it('a count that fits is drawn as declared', async () => {
		const wrapper = mountSized({ shape: 'lines', count: 4 }, 300, 400)
		await wrapper.vm.$nextTick()
		const lines = wrapper.findAll('.cn-widget-placeholder__line')
		expect(lines).toHaveLength(4)
		expect(lines[3].classes()).toContain('cn-widget-placeholder__line--short')
		expect(lines[0].classes()).not.toContain('cn-widget-placeholder__line--short')
	})

	it('heading renders nothing', () => {
		const wrapper = mount(CnWidgetPlaceholder, { props: { shape: 'heading' } })
		expect(wrapper.find('.cn-widget-placeholder').exists()).toBe(false)
	})

	it('an unknown shape draws rows', () => {
		const wrapper = mount(CnWidgetPlaceholder, { props: { shape: 'spinner' } })
		expect(wrapper.attributes('data-shape')).toBe('rows')
	})

	it.each([
		['rows', 2],
		['lines', 4],
		['block', 1],
		['tiles', 3],
		['counter', 2],
	])('pins the markup contract of %s', (shape, count) => {
		const wrapper = mount(CnWidgetPlaceholder, { props: { shape, count } })
		expect(wrapper.html()).toMatchSnapshot()
	})

	it('fits tiles and counters to the width', () => {
		expect(placeholderCapacity('tiles', 296, 140)).toBe(4 * 2)
		expect(placeholderCapacity('counter', 330, 80)).toBe(3)
		expect(placeholderCapacity('block', 10, 10)).toBe(1)
		expect(placeholderCapacity('rows', 100, 10)).toBe(1)
	})
})

describe('css/widget-placeholder.css', () => {
	const css = readFileSync(join(__dirname, '../../../../css/widget-placeholder.css'), 'utf8')

	it('holds only placeholder rules', () => {
		const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+(?=\{)/g).map((s) => s.trim())
		const outside = selectors.filter((s) => !s.includes('cn-widget-placeholder') && !/^(from|to|@media.*|@keyframes.*)$/.test(s))
		expect(outside).toEqual([])
	})

	it('uses Nextcloud colour variables only and stops the shimmer for reduced motion', () => {
		expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|--nldesign-/i)
		expect(css).toContain('animation: cn-widget-placeholder-shimmer 1.8s')
		expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.cn-widget-placeholder \*\s*\{\s*animation: none;/)
	})

	it('stays under 2 KB without comments and whitespace', () => {
		const minified = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1')
		expect(minified.length).toBeLessThan(2048)
	})
})

describe('CnWidgetPlaceholder sizing through one ResizeObserver', () => {
	let observers
	let original

	beforeEach(() => {
		observers = []
		original = global.ResizeObserver
		global.ResizeObserver = class {
			constructor(callback) {
				this.callback = callback
				this.targets = new Set()
				observers.push(this)
			}

			observe(el) { this.targets.add(el) }
			unobserve(el) { this.targets.delete(el) }
			disconnect() { this.targets.clear() }
		}
	})

	afterEach(() => {
		global.ResizeObserver = original
	})

	/**
	 * Mount a placeholder whose root throws when its size is read from the DOM.
	 *
	 * @param {object} props The props.
	 * @return {object} The wrapper.
	 */
	function mountUnread(props) {
		const reads = { count: 0 }
		const proto = window.HTMLElement.prototype
		const spy = jest.spyOn(proto, 'clientWidth', 'get').mockImplementation(() => {
			reads.count++
			return 0
		})
		const wrapper = mount(CnWidgetPlaceholder, { props })
		spy.mockRestore()
		return { wrapper, reads }
	}

	it('reads no layout on mount: two placeholders share one observer and are sized from its entries', async () => {
		const a = mountUnread({ shape: 'rows' })
		const b = mountUnread({ shape: 'lines' })
		expect(a.reads.count + b.reads.count).toBe(0)
		expect(observers).toHaveLength(1)
		const [observer] = observers
		expect(observer.targets.size).toBe(2)

		observer.callback([
			{ target: a.wrapper.vm.$refs.root, contentRect: { width: 300, height: 220 } },
			{ target: b.wrapper.vm.$refs.root, contentRect: { width: 300, height: 95.6 } },
		])
		await a.wrapper.vm.$nextTick()
		expect(a.wrapper.findAll('.cn-widget-placeholder__row')).toHaveLength(5)
		expect(b.wrapper.findAll('.cn-widget-placeholder__line')).toHaveLength(4)

		a.wrapper.unmount()
		expect(observer.targets.size).toBe(1)
		b.wrapper.unmount()
		expect(observer.targets.size).toBe(0)
	})

	it('draws the unmeasured count until the first callback', () => {
		const { wrapper } = mountUnread({ shape: 'rows', count: 12 })
		expect(wrapper.findAll('.cn-widget-placeholder__row')).toHaveLength(12)
		wrapper.unmount()
	})

	it('tiles read their tile size in the callback, not while rendering', async () => {
		const style = jest.spyOn(window, 'getComputedStyle')
		const { wrapper } = mountUnread({ shape: 'tiles' })
		expect(style).not.toHaveBeenCalled()
		const root = wrapper.vm.$refs.root
		root.style.setProperty('--cn-placeholder-tile-size', '100px')
		observers[0].callback([{ target: root, contentRect: { width: 224, height: 100 } }])
		await wrapper.vm.$nextTick()
		expect(style).toHaveBeenCalledTimes(1)
		expect(wrapper.findAll('.cn-widget-placeholder__tile')).toHaveLength(2)
		style.mockRestore()
		wrapper.unmount()
	})
})

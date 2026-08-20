/**
 * Tests for CnNavCardGrid — the built-in v2 widget rendering a grid of
 * navigation-link cards (ADR-044 §4 cards-collapse).
 *
 * Covers openspec/changes/cn-nav-card-grid:
 * - label/description/icon render
 * - route vs href mutual exclusion in rendered output
 * - count:"auto" resolution via injected cnManifest + cnMenuCounts
 * - an unresolvable route renders the card DISABLED, not hidden
 * - no aria-label on any card (description via aria-describedby)
 *
 * Keyboard activation (Tab reaches a card, Enter activates it) is NOT
 * covered here — see e2e/cn-nav-card-grid.e2e.js for why jsdom cannot
 * measure that claim.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnNavCardGrid from '../../src/components/CnNavCardGrid/CnNavCardGrid.vue'

const RouterLinkStub = {
	name: 'RouterLink',
	props: ['to'],
	render() {
		return h('a', { 'data-test': 'router-link', 'data-to': JSON.stringify(this.to) }, this.$slots.default?.())
	},
}

function mountGrid(propsData, { provide = {} } = {}) {
	return mount(CnNavCardGrid, {
		propsData,
		global: {
			stubs: { 'router-link': RouterLinkStub, RouterLink: RouterLinkStub },
			provide,
		},
	})
}

describe('CnNavCardGrid — entry rendering', () => {
	it('renders the label for every entry', () => {
		const wrapper = mountGrid({ entries: [{ id: 'levels', label: 'Levels' }] })
		expect(wrapper.text()).toContain('Levels')
	})

	it('renders the description when present', () => {
		const wrapper = mountGrid({ entries: [{ id: 'w', label: 'Warnings', description: 'Flagged items needing review' }] })
		expect(wrapper.text()).toContain('Flagged items needing review')
	})

	it('omits the description element when absent', () => {
		const wrapper = mountGrid({ entries: [{ id: 'w', label: 'Warnings' }] })
		expect(wrapper.find('.cn-nav-card-grid__description').exists()).toBe(false)
	})

	it('renders the icon when present', () => {
		const wrapper = mountGrid({ entries: [{ id: 'r', label: 'Responses', icon: 'ChartLine' }] })
		expect(wrapper.findComponent({ name: 'CnIcon' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnIcon' }).props('name')).toBe('ChartLine')
	})

	it('omits the icon when absent', () => {
		const wrapper = mountGrid({ entries: [{ id: 'r', label: 'Responses' }] })
		expect(wrapper.findComponent({ name: 'CnIcon' }).exists()).toBe(false)
	})
})

describe('CnNavCardGrid — route vs href are mutually exclusive in rendered output', () => {
	it('a route entry renders a router-link', () => {
		const wrapper = mountGrid({
			entries: [{ id: 'levels', label: 'Levels', route: 'Levels' }],
		}, {
			provide: { cnManifest: { pages: [{ id: 'Levels', type: 'index' }] } },
		})
		const link = wrapper.find('[data-test="router-link"]')
		expect(link.exists()).toBe(true)
		expect(JSON.parse(link.attributes('data-to')).name).toBe('Levels')
		expect(wrapper.find('a[href]').exists()).toBe(false)
	})

	it('an href entry renders a plain anchor, not a router-link', () => {
		const wrapper = mountGrid({
			entries: [{ id: 'docs', label: 'Documentation', href: 'https://example.org/docs' }],
		})
		expect(wrapper.find('[data-test="router-link"]').exists()).toBe(false)
		const anchor = wrapper.find('a.cn-nav-card-grid__card')
		expect(anchor.attributes('href')).toBe('https://example.org/docs')
		expect(anchor.attributes('target')).toBe('_blank')
		expect(anchor.attributes('rel')).toBe('noopener noreferrer')
	})

	it('an entry with neither route nor href renders a plain, non-disabled div', () => {
		const wrapper = mountGrid({ entries: [{ id: 'info', label: 'Info only' }] })
		const card = wrapper.find('.cn-nav-card-grid__card')
		expect(card.element.tagName).toBe('DIV')
		expect(card.attributes('aria-disabled')).toBeUndefined()
	})
})

describe('CnNavCardGrid — count resolution', () => {
	it('renders an integer count as-is, without consulting cnMenuCounts', () => {
		const wrapper = mountGrid(
			{ entries: [{ id: 'r', label: 'Responses', count: 7 }] },
			{ provide: { cnMenuCounts: { should: { not: { be: 'used' } } } } },
		)
		const bubble = wrapper.findComponent({ name: 'NcCounterBubble' })
		expect(bubble.exists()).toBe(true)
		expect(Number(bubble.attributes('count'))).toBe(7)
	})

	it('count:"auto" resolves via injected cnManifest page lookup + cnMenuCounts', () => {
		const wrapper = mountGrid(
			{ entries: [{ id: 'levels', label: 'Levels', route: 'Levels', count: 'auto' }] },
			{
				provide: {
					cnManifest: {
						pages: [{ id: 'Levels', type: 'index', config: { register: 'game', schema: 'level' } }],
					},
					cnMenuCounts: { game: { level: 42 } },
				},
			},
		)
		const bubble = wrapper.findComponent({ name: 'NcCounterBubble' })
		expect(bubble.exists()).toBe(true)
		expect(Number(bubble.attributes('count'))).toBe(42)
	})

	it('an unresolved auto count renders no badge (not a false zero)', () => {
		const wrapper = mountGrid(
			{ entries: [{ id: 'levels', label: 'Levels', route: 'Levels', count: 'auto' }] },
			{ provide: { cnManifest: { pages: [{ id: 'Levels', type: 'index', config: { register: 'game', schema: 'level' } }] }, cnMenuCounts: {} } },
		)
		expect(wrapper.findComponent({ name: 'NcCounterBubble' }).exists()).toBe(false)
	})
})

describe('CnNavCardGrid — unresolvable route renders disabled, not hidden', () => {
	it('a route with no matching page renders the card present and aria-disabled', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountGrid(
			{ entries: [{ id: 'levels', label: 'Levels', route: 'Levels' }] },
			{ provide: { cnManifest: { pages: [] } } },
		)
		const card = wrapper.find('.cn-nav-card-grid__card')
		expect(card.exists()).toBe(true)
		expect(card.text()).toContain('Levels')
		expect(card.attributes('aria-disabled')).toBe('true')
		expect(card.element.tagName).toBe('DIV')
		warnSpy.mockRestore()
	})

	it('warns exactly once, naming the entry id and the route', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		mountGrid(
			{ entries: [{ id: 'levels', label: 'Levels', route: 'Levels' }] },
			{ provide: { cnManifest: { pages: [] } } },
		)
		const navCardWarnings = warnSpy.mock.calls.filter(([msg]) => typeof msg === 'string' && msg.includes('[CnNavCardGrid]'))
		expect(navCardWarnings).toHaveLength(1)
		expect(navCardWarnings[0][0]).toContain('levels')
		expect(navCardWarnings[0][0]).toContain('Levels')
		warnSpy.mockRestore()
	})

	it('a resolvable route is NOT disabled', () => {
		const wrapper = mountGrid(
			{ entries: [{ id: 'levels', label: 'Levels', route: 'Levels' }] },
			{ provide: { cnManifest: { pages: [{ id: 'Levels', type: 'index' }] } } },
		)
		const card = wrapper.find('.cn-nav-card-grid__card')
		expect(card.attributes('aria-disabled')).toBeUndefined()
		expect(card.element.tagName).toBe('A')
	})
})

describe('CnNavCardGrid — accessibility: no aria-label anywhere', () => {
	it('no rendered card carries an aria-label attribute', () => {
		const wrapper = mountGrid({
			entries: [
				{ id: 'a', label: 'A', route: 'A', description: 'desc a' },
				{ id: 'b', label: 'B', href: 'https://example.org' },
				{ id: 'c', label: 'C' },
			],
		}, { provide: { cnManifest: { pages: [{ id: 'A', type: 'index' }] } } })
		wrapper.findAll('.cn-nav-card-grid__card').forEach((card) => {
			expect(card.attributes('aria-label')).toBeUndefined()
		})
	})

	it('a card with a description carries aria-describedby pointing at the description element id', () => {
		const wrapper = mountGrid(
			{ entries: [{ id: 'a', label: 'A', description: 'desc a' }], widgetId: 'test-widget' },
		)
		const card = wrapper.find('.cn-nav-card-grid__card')
		const describedBy = card.attributes('aria-describedby')
		expect(describedBy).toBeTruthy()
		expect(wrapper.find(`#${describedBy}`).text()).toBe('desc a')
	})
})

describe('CnNavCardGrid — ordering', () => {
	it('entries with an explicit order render first, ascending; unordered entries keep relative order and render last', () => {
		const wrapper = mountGrid({
			entries: [
				{ id: 'z', label: 'Z (no order)' },
				{ id: 'b', label: 'B (order 2)', order: 2 },
				{ id: 'a', label: 'A (order 1)', order: 1 },
				{ id: 'y', label: 'Y (no order)' },
			],
		})
		const labels = wrapper.findAll('.cn-nav-card-grid__label').map((n) => n.text())
		expect(labels).toEqual(['A (order 1)', 'B (order 2)', 'Z (no order)', 'Y (no order)'])
	})
})

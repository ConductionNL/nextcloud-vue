/**
 * Tests for CnDeckCard — bespoke surface-aware widget for the `deck`
 * integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: count headline + stack distribution;
 *  - detail-page: mini-kanban with linked card highlighted;
 *  - single-entity: chip rendering.
 * Plus error / unavailable handling that mirrors CnIntegrationCard.
 */

const { mount } = require('@vue/test-utils')
const CnDeckCard = require('../CnDeckCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function makeCard(overrides = {}) {
	return {
		id: 1,
		cardId: 1,
		cardTitle: 'Investigate ticket',
		boardId: 10,
		stackId: 100,
		stackTitle: 'To Do',
		linkedAt: '2026-05-23T10:00:00+00:00',
		...overrides,
	}
}

describe('CnDeckCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked cards', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnDeckCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No cards linked yet')
		wrapper.unmount()
	})

	it('renders a count headline + stack distribution on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeCard({ cardId: 1, stackId: 100, stackTitle: 'To Do' }),
					makeCard({ cardId: 2, stackId: 100, stackTitle: 'To Do' }),
					makeCard({ cardId: 3, stackId: 200, stackTitle: 'Doing' }),
				],
			}),
		})
		const wrapper = mount(CnDeckCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		// 3 cards, 2 stacks
		expect(txt).toContain('3')
		expect(txt).toContain('2')
		expect(wrapper.find('.cn-deck-card__headline').exists()).toBe(true)
		expect(wrapper.find('.cn-deck-card__distribution').exists()).toBe(true)
		wrapper.unmount()
	})

	it('renders a mini-kanban on the detail-page surface and highlights the linked card', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeCard({ cardId: 1, stackId: 100, stackTitle: 'To Do' }),
					makeCard({ cardId: 2, stackId: 200, stackTitle: 'Doing' }),
					makeCard({ cardId: 3, stackId: 300, stackTitle: 'Done' }),
				],
			}),
		})
		const wrapper = mount(CnDeckCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page', value: '2' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const columns = wrapper.findAll('.cn-deck-card__column')
		expect(columns).toHaveLength(3)
		const highlighted = wrapper.findAll('.cn-deck-card__row--highlight')
		expect(highlighted).toHaveLength(1)
		wrapper.unmount()
	})

	it('caps mini-kanban at three columns even with more stacks', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeCard({ cardId: 1, stackId: 100, stackTitle: 'A' }),
					makeCard({ cardId: 2, stackId: 200, stackTitle: 'B' }),
					makeCard({ cardId: 3, stackId: 300, stackTitle: 'C' }),
					makeCard({ cardId: 4, stackId: 400, stackTitle: 'D' }),
				],
			}),
		})
		const wrapper = mount(CnDeckCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const columns = wrapper.findAll('.cn-deck-card__column')
		expect(columns).toHaveLength(3)
		wrapper.unmount()
	})

	it('renders a chip on the single-entity surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeCard({ cardId: 42, cardTitle: 'Migrate DB', stackTitle: 'Doing' })),
		})
		const wrapper = mount(CnDeckCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: 42 } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-deck-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Migrate DB')
		expect(chip.text()).toContain('Doing')
		wrapper.unmount()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnDeckCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Deck is currently unavailable.')
		wrapper.unmount()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnDeckCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No cards linked yet')
		wrapper.unmount()
		spy.mockRestore()
	})
})

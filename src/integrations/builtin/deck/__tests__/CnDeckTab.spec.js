/**
 * Tests for CnDeckTab — bespoke sidebar tab for the `deck` integration.
 *
 * Covers:
 *  - empty-state with "Open Deck" CTA when the provider returns no cards;
 *  - card rendering grouped by stack (kanban-mini);
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws;
 *  - overdue marking when duedate is in the past.
 */

const { mount } = require('@vue/test-utils')
const CnDeckTab = require('../CnDeckTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
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

describe('CnDeckTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Deck" CTA when no cards', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnDeckTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No cards linked yet')
		expect(wrapper.text()).toContain('Open Deck')
		wrapper.unmount()
	})

	it('groups cards by stack into kanban columns', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeCard({ cardId: 1, cardTitle: 'A', stackId: 100, stackTitle: 'To Do' }),
					makeCard({ cardId: 2, cardTitle: 'B', stackId: 100, stackTitle: 'To Do' }),
					makeCard({ cardId: 3, cardTitle: 'C', stackId: 200, stackTitle: 'Doing' }),
				],
			}),
		})
		const wrapper = mount(CnDeckTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const columns = wrapper.findAll('.cn-deck-tab__column')
		expect(columns).toHaveLength(2)
		expect(wrapper.text()).toContain('To Do')
		expect(wrapper.text()).toContain('Doing')
		const cards = wrapper.findAll('.cn-deck-tab__card')
		expect(cards).toHaveLength(3)
		wrapper.unmount()
	})

	it('marks cards with a past duedate as overdue', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeCard({ cardId: 1, duedate: '2020-01-01T10:00:00+00:00' }),
					makeCard({ cardId: 2, duedate: '2099-01-01T10:00:00+00:00', stackId: 200 }),
				],
			}),
		})
		const wrapper = mount(CnDeckTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const overdue = wrapper.findAll('.cn-deck-tab__card--overdue')
		expect(overdue).toHaveLength(1)
		wrapper.unmount()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnDeckTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Deck is currently unavailable.')
		expect(wrapper.find('.cn-deck-tab__card').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnDeckTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load cards.')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('exposes Link and Create action buttons (Tier-2)', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnDeckTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Link existing card')
		expect(wrapper.text()).toContain('Create new card')
		wrapper.unmount()
	})

	it('opens the picker when "Link existing card" is clicked', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnDeckTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		wrapper.vm.openPicker()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.pickerOpen).toBe(true)
		wrapper.unmount()
	})

	it('opens the create dialog when "Create new card" is clicked', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnDeckTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		wrapper.vm.openCreate()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.createOpen).toBe(true)
		wrapper.unmount()
	})

	it('POSTs the link payload to /deck on link pick', async () => {
		const calls = []
		global.fetch = jest.fn().mockImplementation((url, opts) => {
			calls.push({ url, opts })
			return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		})
		const wrapper = mount(CnDeckTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.onLinkPick({ cardId: 42 })
		expect(calls.some(c => /\/deck$/.test(String(c.url)) && c.opts && c.opts.method === 'POST')).toBe(true)
		wrapper.unmount()
	})

	it('POSTs the create payload to /deck/new on create pick', async () => {
		const calls = []
		global.fetch = jest.fn().mockImplementation((url, opts) => {
			calls.push({ url, opts })
			return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		})
		const wrapper = mount(CnDeckTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.onCreatePick({ boardId: 1, stackId: 2, title: 'X' })
		expect(calls.some(c => /\/deck\/new$/.test(String(c.url)) && c.opts && c.opts.method === 'POST')).toBe(true)
		wrapper.unmount()
	})
})

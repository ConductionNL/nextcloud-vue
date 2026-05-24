/**
 * Tests for CnEmailTab — sidebar tab for the `email` integration.
 * Asserts fetch wiring, empty/loaded/error states, and load-more paging.
 */

const { mount } = require('@vue/test-utils')
const CnEmailTab = require('../CnEmailTab.vue').default

describe('CnEmailTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when no messages exist', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ results: [], total: 0 }),
		})
		const wrapper = mount(CnEmailTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No linked emails yet')
		wrapper.destroy()
	})

	it('renders the error label on a failed fetch', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })
		const wrapper = mount(CnEmailTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load emails')
		wrapper.destroy()
	})

	it('renders fetched messages and shows load-more when more exist', async () => {
		const sampleResults = (count) => new Array(count).fill(null).map((_, i) => ({
			id: i + 1,
			subject: `Subject ${i + 1}`,
			sender: `user${i + 1}@example.com`,
			mailDate: '2026-01-01T09:00:00Z',
			mailAccountId: 1,
			mailMessageId: i + 100,
		}))
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ results: sampleResults(3), total: 10 }),
		})
		const wrapper = mount(CnEmailTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1', pageSize: 3 },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		// 3 NcListItem stubs rendered, one per message.
		expect(wrapper.findAll('.stub.NcListItem')).toHaveLength(3)
		expect(wrapper.vm.messages).toHaveLength(3)
		expect(wrapper.vm.total).toBe(10)
		// Load-more visible because messages.length (3) < total (10)
		expect(wrapper.find('.cn-sidebar-tab__load-more').exists()).toBe(true)
		wrapper.destroy()
	})

	it('appends results when load-more is clicked', async () => {
		const page0 = new Array(3).fill(null).map((_, i) => ({
			id: i + 1, subject: `s${i + 1}`, sender: 'a', mailAccountId: 1, mailMessageId: i,
		}))
		const page1 = new Array(2).fill(null).map((_, i) => ({
			id: i + 4, subject: `s${i + 4}`, sender: 'b', mailAccountId: 1, mailMessageId: i + 10,
		}))
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: page0, total: 5 }) })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: page1, total: 5 }) })
		const wrapper = mount(CnEmailTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1', pageSize: 3 },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.messages).toHaveLength(3)
		await wrapper.find('.cn-sidebar-tab__load-more').trigger('click')
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.messages).toHaveLength(5)
		// Load-more hidden once we've drained `total`.
		expect(wrapper.find('.cn-sidebar-tab__load-more').exists()).toBe(false)
		wrapper.destroy()
	})

	it('skips the fetch when register or schema is empty', async () => {
		global.fetch = jest.fn()
		const wrapper = mount(CnEmailTab, {
			propsData: { objectId: 'o1', register: '', schema: '' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(global.fetch).not.toHaveBeenCalled()
		wrapper.destroy()
	})
})

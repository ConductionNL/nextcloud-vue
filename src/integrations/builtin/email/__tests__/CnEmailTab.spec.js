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
		wrapper.unmount()
	})

	it('renders the error label on a failed fetch', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })
		const wrapper = mount(CnEmailTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load emails')
		wrapper.unmount()
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
		// 3 NC-Mail-style rows rendered, one per message.
		expect(wrapper.findAll('.cn-email-tab__row')).toHaveLength(3)
		expect(wrapper.vm.messages).toHaveLength(3)
		expect(wrapper.vm.total).toBe(10)
		// Load-more visible because messages.length (3) < total (10)
		expect(wrapper.find('.cn-sidebar-tab__load-more').exists()).toBe(true)
		wrapper.unmount()
	})

	it('marks unread rows and renders sender + snippet (NC Mail fidelity)', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{
						id: 1,
						subject: 'Hello',
						senderName: 'Jane Doe',
						senderEmail: 'jane@example.com',
						preview: 'A short preview of the message body',
						unread: true,
						mailDate: '2026-01-01T09:00:00Z',
						mailAccountId: 1,
						mailMessageId: 100,
					},
					{
						id: 2,
						subject: 'Re: Hello',
						senderName: 'John Roe',
						preview: 'Another preview',
						unread: false,
						mailDate: '2026-01-02T09:00:00Z',
						mailAccountId: 1,
						mailMessageId: 101,
					},
				],
				total: 2,
			}),
		})
		const wrapper = mount(CnEmailTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-email-tab__row')
		expect(rows).toHaveLength(2)
		// First row unread → carries the modifier class.
		expect(rows.at(0).classes()).toContain('cn-email-tab__row--unread')
		expect(rows.at(1).classes()).not.toContain('cn-email-tab__row--unread')
		// Sender name + snippet are surfaced.
		expect(wrapper.text()).toContain('Jane Doe')
		expect(wrapper.text()).toContain('A short preview of the message body')
		wrapper.unmount()
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
		wrapper.unmount()
	})

	it('reads the standardized {items, total, nextCursor} envelope', async () => {
		const items = new Array(3).fill(null).map((_, i) => ({
			id: i + 1, subject: `s${i + 1}`, sender: 'a', mailAccountId: 1, mailMessageId: i,
		}))
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ items, total: 10, nextCursor: '1' }),
		})
		const wrapper = mount(CnEmailTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1', pageSize: 3 },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.messages).toHaveLength(3)
		expect(wrapper.vm.total).toBe(10)
		expect(wrapper.vm.nextCursor).toBe('1')
		// hasMore driven by the cursor, not just the count comparison.
		expect(wrapper.vm.hasMore).toBe(true)
		expect(wrapper.find('.cn-sidebar-tab__load-more').exists()).toBe(true)
		wrapper.unmount()
	})

	it('walks nextCursor via the _page query param on load-more', async () => {
		const page0 = [{ id: 1, subject: 's1', sender: 'a', mailAccountId: 1, mailMessageId: 0 }]
		const page1 = [{ id: 2, subject: 's2', sender: 'b', mailAccountId: 1, mailMessageId: 1 }]
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: page0, total: 2, nextCursor: '1' }) })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: page1, total: 2, nextCursor: null }) })
		const wrapper = mount(CnEmailTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1', pageSize: 1 },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.messages).toHaveLength(1)
		await wrapper.find('.cn-sidebar-tab__load-more').trigger('click')
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.messages).toHaveLength(2)
		// The second fetch carried the cursor as `_page=1`.
		const secondUrl = global.fetch.mock.calls[1][0]
		expect(secondUrl).toContain('_page=1')
		// nextCursor cleared, load-more gone.
		expect(wrapper.vm.nextCursor).toBeNull()
		expect(wrapper.find('.cn-sidebar-tab__load-more').exists()).toBe(false)
		wrapper.unmount()
	})

	it('skips the fetch when register or schema is empty', async () => {
		global.fetch = jest.fn()
		const wrapper = mount(CnEmailTab, {
			propsData: { objectId: 'o1', register: '', schema: '' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(global.fetch).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})

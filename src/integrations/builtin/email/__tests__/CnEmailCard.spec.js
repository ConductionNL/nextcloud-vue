/**
 * Tests for CnEmailCard — compact email widget for the integration
 * registry. Asserts fetch wiring, empty/loaded/error states, overflow
 * control, single-entity surface, and subject/sender/when formatters.
 */

const { mount } = require('@vue/test-utils')
const CnEmailCard = require('../CnEmailCard.vue').default

describe('CnEmailCard', () => {
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
		const wrapper = mount(CnEmailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No linked emails yet')
		wrapper.unmount()
	})

	it('renders rows for each fetched message up to maxDisplay', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ id: 1, subject: 'Hello world', sender: 'alice@example.com', mailDate: '2026-01-05T09:00:00Z', mailAccountId: 1, mailMessageId: 10 },
					{ id: 2, subject: 'Project update', sender: 'bob@example.com', mailDate: '2026-01-04T09:00:00Z', mailAccountId: 1, mailMessageId: 11 },
					{ id: 3, subject: 'Re: meeting', sender: 'carol@example.com', mailDate: '2026-01-03T09:00:00Z', mailAccountId: 1, mailMessageId: 12 },
					{ id: 4, subject: 'Invoice', sender: 'dave@example.com', mailDate: '2026-01-02T09:00:00Z', mailAccountId: 1, mailMessageId: 13 },
					{ id: 5, subject: 'Notes', sender: 'eve@example.com', mailDate: '2026-01-01T09:00:00Z', mailAccountId: 1, mailMessageId: 14 },
					{ id: 6, subject: 'Reminder', sender: 'frank@example.com', mailDate: '2025-12-31T09:00:00Z', mailAccountId: 1, mailMessageId: 15 },
				],
				total: 6,
			}),
		})
		const wrapper = mount(CnEmailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1', maxDisplay: 5 },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-email-card__row')).toHaveLength(5)
		expect(wrapper.text()).toContain('Hello world')
		expect(wrapper.text()).toContain('alice@example.com')
		expect(wrapper.text()).toContain('Show all')
		wrapper.unmount()
	})

	it('emits show-all when the overflow control is clicked', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: new Array(6).fill(null).map((_, i) => ({
					id: i,
					subject: `m${i}`,
					sender: 's@example.com',
					mailAccountId: 1,
					mailMessageId: i,
				})),
				total: 6,
			}),
		})
		const wrapper = mount(CnEmailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.find('.cn-email-card__show-all').trigger('click')
		expect(wrapper.emitted('show-all')).toBeTruthy()
		wrapper.unmount()
	})

	it('renders the error label on a failed fetch', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })
		const wrapper = mount(CnEmailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load emails')
		wrapper.unmount()
	})

	it('falls back to "(no subject)" + "Unknown sender" when fields are missing', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [{ id: 1, subject: null, sender: null, mailAccountId: 1, mailMessageId: 10 }],
				total: 1,
			}),
		})
		const wrapper = mount(CnEmailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('(no subject)')
		expect(wrapper.text()).toContain('Unknown sender')
		wrapper.unmount()
	})

	it('limits to a single row on the single-entity surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ id: 1, subject: 'one', sender: 'a', mailAccountId: 1, mailMessageId: 10 },
					{ id: 2, subject: 'two', sender: 'b', mailAccountId: 1, mailMessageId: 11 },
				],
				total: 2,
			}),
		})
		const wrapper = mount(CnEmailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1', surface: 'single-entity' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-email-card__row')).toHaveLength(1)
		expect(wrapper.text()).toContain('one')
		wrapper.unmount()
	})
})

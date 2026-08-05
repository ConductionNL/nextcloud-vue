/**
 * Tests for CnAuditTrailCard — compact audit-trail widget for the
 * integration registry. Asserts fetch wiring, empty/loaded states,
 * overflow control, and the actor/when formatters.
 */

const { mount } = require('@vue/test-utils')
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default

describe('CnAuditTrailCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when no entries exist', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnAuditTrailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No audit entries yet')
		wrapper.destroy()
	})

	it('renders rows for each fetched entry up to maxDisplay', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ id: '1', action: 'create', actor: 'alice', creationDateTime: '2026-01-01T10:00:00Z' },
					{ id: '2', action: 'update', actor: 'bob', creationDateTime: '2026-01-02T10:00:00Z' },
					{ id: '3', action: 'delete', actor: 'carol', creationDateTime: '2026-01-03T10:00:00Z' },
					{ id: '4', action: 'restore', actor: 'dave', creationDateTime: '2026-01-04T10:00:00Z' },
					{ id: '5', action: 'lock', actor: 'eve', creationDateTime: '2026-01-05T10:00:00Z' },
					{ id: '6', action: 'unlock', actor: 'frank', creationDateTime: '2026-01-06T10:00:00Z' },
				],
			}),
		})
		const wrapper = mount(CnAuditTrailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1', maxDisplay: 5 },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-audit-card__row')).toHaveLength(5)
		expect(wrapper.text()).toContain('alice')
		expect(wrapper.text()).toContain('Show all')
		wrapper.destroy()
	})

	it('emits show-all when the overflow control is clicked', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: new Array(6).fill(null).map((_, i) => ({ id: String(i), action: 'create', actor: 'a' })),
			}),
		})
		const wrapper = mount(CnAuditTrailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.find('.cn-audit-card__show-all').trigger('click')
		expect(wrapper.emitted('show-all')).toBeTruthy()
		wrapper.destroy()
	})

	it('falls back to actorDisplayName then userId when actor is missing', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ id: '1', action: 'create', actorDisplayName: 'Display Name' },
					{ id: '2', action: 'update', userId: 'uid' },
				],
			}),
		})
		const wrapper = mount(CnAuditTrailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Display Name')
		expect(wrapper.text()).toContain('uid')
		wrapper.destroy()
	})
})

/**
 * Tests for CnTagsCard — compact tags widget for the integration
 * registry. Asserts fetch wiring, empty/loaded states, and the
 * fetch-failure fallback.
 */

const { mount } = require('@vue/test-utils')
const CnTagsCard = require('../../src/components/CnTagsCard/CnTagsCard.vue').default

describe('CnTagsCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when no tags are attached', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnTagsCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No tags')
		wrapper.destroy()
	})

	it('renders one pill per fetched tag', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ id: 1, name: 'urgent' },
					{ id: 2, name: 'review' },
					{ id: 3, name: 'archived' },
				],
			}),
		})
		const wrapper = mount(CnTagsCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-tags-card__pill')).toHaveLength(3)
		expect(wrapper.text()).toContain('urgent')
		expect(wrapper.text()).toContain('archived')
		wrapper.destroy()
	})

	it('does not throw when the API returns an error', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
		const wrapper = mount(CnTagsCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No tags')
		wrapper.destroy()
	})
})

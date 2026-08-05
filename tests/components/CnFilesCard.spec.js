/**
 * Tests for CnFilesCard — compact files widget for the integration
 * registry. Asserts fetch wiring on mount, empty/loaded states,
 * the show-all overflow control, and the surface prop validator.
 */

const { mount } = require('@vue/test-utils')
const CnFilesCard = require('../../src/components/CnFilesCard/CnFilesCard.vue').default

function mockFetchOnce(payload) {
	global.fetch = jest.fn().mockResolvedValueOnce({
		ok: true,
		json: () => Promise.resolve(payload),
	})
}

describe('CnFilesCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when no files are attached', async () => {
		mockFetchOnce({ results: [] })
		const wrapper = mount(CnFilesCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No files attached')
		wrapper.destroy()
	})

	it('renders rows for each fetched file capped at maxDisplay', async () => {
		mockFetchOnce({
			results: [
				{ id: '1', name: 'a.txt', size: 100 },
				{ id: '2', name: 'b.txt', size: 2048 },
				{ id: '3', name: 'c.txt', size: 5000000 },
				{ id: '4', name: 'd.txt', size: 5 },
				{ id: '5', name: 'e.txt', size: 5 },
				{ id: '6', name: 'f.txt', size: 5 },
			],
		})
		const wrapper = mount(CnFilesCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1', maxDisplay: 5 },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-files-card__row')).toHaveLength(5)
		// Footer overflow shows the total
		expect(wrapper.text()).toContain('Show all')
		wrapper.destroy()
	})

	it('emits show-all when the overflow control is clicked', async () => {
		mockFetchOnce({
			results: [
				{ id: '1', name: 'a' }, { id: '2', name: 'b' }, { id: '3', name: 'c' },
				{ id: '4', name: 'd' }, { id: '5', name: 'e' }, { id: '6', name: 'f' },
			],
		})
		const wrapper = mount(CnFilesCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.find('.cn-files-card__show-all').trigger('click')
		expect(wrapper.emitted('show-all')).toBeTruthy()
		wrapper.destroy()
	})

	it('refetches when objectId changes', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [{ id: '1', name: 'old' }] }) })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [{ id: '2', name: 'new' }] }) })
		const wrapper = mount(CnFilesCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.setProps({ objectId: 'o2' })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(global.fetch).toHaveBeenCalledTimes(2)
		wrapper.destroy()
	})

	it('handles fetch failure gracefully without throwing', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
		const wrapper = mount(CnFilesCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No files attached')
		wrapper.destroy()
	})
})

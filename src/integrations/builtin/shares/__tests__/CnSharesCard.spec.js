/**
 * Tests for CnSharesCard — bespoke surface-aware widget for the `shares` integration.
 *
 * Covers:
 *  - dashboard surface count headline by type;
 *  - detail-page surface grouped list;
 *  - single-entity chip rendering;
 *  - empty + degraded + error fallbacks;
 *  - fetchSingle path for single-entity.
 */

const { mount } = require('@vue/test-utils')
const CnSharesCard = require('../CnSharesCard.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makeShare(overrides = {}) {
	return {
		id: 'sh-1',
		shareType: 0,
		shareWith: 'alice',
		shareWithDisplayname: 'Alice',
		permissions: 1,
		passwordProtected: false,
		stime: 1716537600,
		...overrides,
	}
}

describe('CnSharesCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the dashboard count headline split by type', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeShare({ id: 'u1', shareType: 0 }),
					makeShare({ id: 'u2', shareType: 0 }),
					makeShare({ id: 'g1', shareType: 1 }),
					makeShare({ id: 'l1', shareType: 3 }),
				],
			}),
		})
		const wrapper = mount(CnSharesCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const text = wrapper.text()
		expect(text).toMatch(/2 users/)
		expect(text).toMatch(/1 groups/)
		expect(text).toMatch(/1 links/)
		wrapper.destroy()
	})

	it('renders the empty state on dashboard surface when no shares', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnSharesCard, { propsData: { ...DEFAULT_PROPS, surface: 'app-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No shares on this object yet')
		wrapper.destroy()
	})

	it('renders grouped sections on detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeShare({ id: 'u1', shareType: 0, shareWithDisplayname: 'Alice' }),
					makeShare({ id: 'g1', shareType: 1, shareWithDisplayname: 'Editors' }),
				],
			}),
		})
		const wrapper = mount(CnSharesCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const groups = wrapper.findAll('.cn-shares-card__group')
		expect(groups).toHaveLength(2)
		expect(wrapper.text()).toContain('Alice')
		expect(wrapper.text()).toContain('Editors')
		wrapper.destroy()
	})

	it('renders single-entity chip from fetchSingle response', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeShare({ id: 'sh-99', shareType: 3, shareWithDisplayname: 'public', passwordProtected: true })),
		})
		const wrapper = mount(CnSharesCard, {
			propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: 'sh-99' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-shares-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('public')
		// Lock icon should be there for password-protected.
		expect(wrapper.html()).toMatch(/lock-outline/i)
		wrapper.destroy()
	})

	it('renders empty chip on single-entity surface when value missing', async () => {
		// fetchSingle returns early when value is empty; no fetch call expected.
		const wrapper = mount(CnSharesCard, {
			propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: '' },
		})
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No shares on this object yet')
		expect(global.fetch).not.toHaveBeenCalled()
		wrapper.destroy()
	})

	it('shows unavailable label on 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnSharesCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC sharing is currently unavailable.')
		wrapper.destroy()
	})

	it('falls back to empty list when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnSharesCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No shares on this object yet')
		wrapper.destroy()
		spy.mockRestore()
	})
})

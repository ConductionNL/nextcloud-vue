/**
 * Tests for CnCollectivesCard — bespoke surface-aware widget for the
 * `collectives` integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard: count headline + most-recent line;
 *  - detail-page: compact list with view-all trail-off;
 *  - single-entity: emoji + title chip.
 * Plus unavailable / error handling that mirrors CnIntegrationCard.
 */

const { mount } = require('@vue/test-utils')
const CnCollectivesCard = require('../CnCollectivesCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function makePage(overrides = {}) {
	return {
		id: 1,
		title: 'Onboarding handbook',
		url: '/index.php/apps/collectives/team/onboarding-handbook',
		data: { id: 1, slug: 'onboarding-handbook', emoji: '📘' },
		...overrides,
	}
}

describe('CnCollectivesCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked pages', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnCollectivesCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No Knowledge pages linked yet')
		wrapper.unmount()
	})

	it('renders a count headline + most-recent on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePage({ id: 1, title: 'Alpha', lastModified: 1716537700 }),
					makePage({ id: 2, title: 'Bravo', lastModified: 1716537800 }),
					makePage({ id: 3, title: 'Charlie', lastModified: 1716537900 }),
				],
			}),
		})
		const wrapper = mount(CnCollectivesCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		expect(txt).toContain('3')
		expect(wrapper.find('.cn-collectives-card__headline').exists()).toBe(true)
		// most-recent (highest lastModified) shows
		expect(txt).toContain('Charlie')
		wrapper.unmount()
	})

	it('renders a compact list with view-all trail-off on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePage({ id: 1, title: 'A' }),
					makePage({ id: 2, title: 'B' }),
					makePage({ id: 3, title: 'C' }),
					makePage({ id: 4, title: 'D' }),
					makePage({ id: 5, title: 'E' }),
					makePage({ id: 6, title: 'F' }),
				],
			}),
		})
		const wrapper = mount(CnCollectivesCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-collectives-card__row')
		// COMPACT_LIMIT = 5
		expect(rows).toHaveLength(5)
		expect(wrapper.find('.cn-collectives-card__view-all').exists()).toBe(true)
		wrapper.unmount()
	})

	it('renders a chip on the single-entity surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makePage({ id: 7, title: 'Onboarding handbook' })),
		})
		const wrapper = mount(CnCollectivesCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: '7' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-collectives-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Onboarding handbook')
		expect(chip.text()).toContain('📘')
		wrapper.unmount()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnCollectivesCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Knowledge is currently unavailable.')
		wrapper.unmount()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnCollectivesCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No Knowledge pages linked yet')
		wrapper.unmount()
		spy.mockRestore()
	})
})

/**
 * Tests for CnFormsCard — bespoke surface-aware widget for the
 * `forms` integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: count headline + submission tally
 *    + most-recent line;
 *  - detail-page: list with per-row status pill + meta;
 *  - single-entity: chip with form title + status pill.
 * Plus error / unavailable handling that mirrors CnIntegrationCard.
 */

const { mount } = require('@vue/test-utils')
const CnFormsCard = require('../CnFormsCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function futureExpiry(daysAhead = 5) {
	return Math.floor((Date.now() + (daysAhead * 24 * 60 * 60 * 1000)) / 1000)
}

function pastExpiry(daysBehind = 1) {
	return Math.floor((Date.now() - (daysBehind * 24 * 60 * 60 * 1000)) / 1000)
}

function makeForm(overrides = {}) {
	return {
		type: 'form',
		id: '42',
		title: 'Budget intake',
		description: '',
		url: '/index.php/apps/forms/hash-42',
		lastUpdated: Math.floor(Date.now() / 1000) - 3600,
		data: { id: '42', hash: 'hash-42', title: 'Budget intake' },
		...overrides,
	}
}

function makeSubmission(formId = 42, overrides = {}) {
	return {
		type: 'submission',
		id: formId + '/1',
		title: 'Budget intake — submission',
		description: 'alice',
		url: '/index.php/apps/forms/hash-42/results',
		lastUpdated: Math.floor(Date.now() / 1000) - 1800,
		data: { id: 1, formId, userId: 'alice', timestamp: Math.floor(Date.now() / 1000) - 1800 },
		...overrides,
	}
}

describe('CnFormsCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked forms', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnFormsCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No forms linked yet')
		wrapper.unmount()
	})

	it('renders a count + submission headline on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeForm({ id: '1', title: 'Closed motion', expiresAt: pastExpiry(2) }),
					makeForm({ id: '2', title: 'Open motion', expiresAt: futureExpiry(3) }),
					makeSubmission(1),
					makeSubmission(2, { id: '2/1', data: { id: 1, formId: 2 } }),
					makeSubmission(2, { id: '2/2', data: { id: 2, formId: 2 } }),
				],
			}),
		})
		const wrapper = mount(CnFormsCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		// "2 forms" + "1 open"
		expect(txt).toContain('2')
		expect(txt.toLowerCase()).toContain('open')
		expect(txt).toContain('3 submissions')
		expect(wrapper.find('.cn-forms-card__headline').exists()).toBe(true)
		wrapper.unmount()
	})

	it('falls back to the "all closed" headline when nothing is open', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeForm({ id: '1', expiresAt: pastExpiry(5) }),
					makeForm({ id: '2', expiresAt: pastExpiry(2) }),
				],
			}),
		})
		const wrapper = mount(CnFormsCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text().toLowerCase()).toContain('all closed')
		wrapper.unmount()
	})

	it('renders a list of rows with a status pill on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeForm({ id: '1', title: 'A', expiresAt: futureExpiry(3) }),
					makeForm({ id: '2', title: 'B', expiresAt: pastExpiry(2) }),
				],
			}),
		})
		const wrapper = mount(CnFormsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-forms-card__row')
		expect(rows).toHaveLength(2)
		expect(wrapper.find('.cn-forms-card__status--open').exists()).toBe(true)
		expect(wrapper.find('.cn-forms-card__status--closed').exists()).toBe(true)
		expect(wrapper.text()).toContain('Closes in')
		wrapper.unmount()
	})

	it('renders a chip on the single-entity surface with a status pill', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeForm({ id: '99', title: 'Charter intake' })),
		})
		const wrapper = mount(CnFormsCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: '99' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-forms-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Charter intake')
		expect(chip.text()).toContain('Open')
		wrapper.unmount()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnFormsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Forms is currently unavailable.')
		wrapper.unmount()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnFormsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No forms linked yet')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('marks closed forms visually on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [makeForm({ id: '1', expiresAt: pastExpiry(2) })],
			}),
		})
		const wrapper = mount(CnFormsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-forms-card__row--closed').exists()).toBe(true)
		expect(wrapper.text()).toContain('Closed')
		wrapper.unmount()
	})
})

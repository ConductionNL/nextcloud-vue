/**
 * Tests for CnPollsCard — bespoke surface-aware widget for the `polls`
 * integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: count headline + most-recent line
 *    with the leading option highlighted;
 *  - detail-page: list with per-row mini option bars + deadline meta;
 *  - single-entity: chip with poll title + leader fragment.
 * Plus error / unavailable handling that mirrors CnIntegrationCard.
 */

const { mount } = require('@vue/test-utils')
const CnPollsCard = require('../CnPollsCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function futureDeadline(daysAhead = 5) {
	return Math.floor((Date.now() + (daysAhead * 24 * 60 * 60 * 1000)) / 1000)
}

function pastDeadline(daysBehind = 1) {
	return Math.floor((Date.now() - (daysBehind * 24 * 60 * 60 * 1000)) / 1000)
}

function makePoll(overrides = {}) {
	return {
		id: 42,
		title: 'Approve the budget [or:obj-1]',
		description: '',
		type: 'datePoll',
		deadline: futureDeadline(5),
		voterCount: 12,
		options: [
			{ id: 1, text: 'Yes', votes: 7 },
			{ id: 2, text: 'No', votes: 3 },
			{ id: 3, text: 'Abstain', votes: 2 },
		],
		url: '/index.php/apps/polls/vote/42',
		...overrides,
	}
}

describe('CnPollsCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked polls', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnPollsCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No polls linked yet')
		wrapper.destroy()
	})

	it('renders a count headline + leading option on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePoll({ id: 1, title: 'Closed motion [or:obj-1]', deadline: pastDeadline(2) }),
					makePoll({ id: 2, title: 'Open motion [or:obj-1]', deadline: futureDeadline(3) }),
				],
			}),
		})
		const wrapper = mount(CnPollsCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		// "2 polls" and "1 open"
		expect(txt).toContain('2')
		expect(txt).toContain('1')
		expect(txt.toLowerCase()).toContain('open')
		// Leading option from most-recent poll (yes 7/12 = 58%)
		expect(txt).toContain('Yes')
		expect(wrapper.find('.cn-polls-card__headline').exists()).toBe(true)
		wrapper.destroy()
	})

	it('falls back to the "all closed" headline when nothing is open', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePoll({ id: 1, deadline: pastDeadline(5) }),
					makePoll({ id: 2, deadline: pastDeadline(2) }),
				],
			}),
		})
		const wrapper = mount(CnPollsCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		expect(txt.toLowerCase()).toContain('all closed')
		wrapper.destroy()
	})

	it('renders a list of rows with mini bars on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePoll({ id: 1, title: 'A [or:obj-1]', deadline: futureDeadline(3) }),
					makePoll({ id: 2, title: 'B [or:obj-1]', deadline: futureDeadline(2) }),
				],
			}),
		})
		const wrapper = mount(CnPollsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-polls-card__row')
		expect(rows).toHaveLength(2)
		// 3 options per row, 6 bars total
		const bars = wrapper.findAll('.cn-polls-card__option-bar')
		expect(bars).toHaveLength(6)
		// Each row carries its meta countdown
		expect(wrapper.text()).toContain('Closes in')
		wrapper.destroy()
	})

	it('renders a chip on the single-entity surface with the leading option', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makePoll({ id: 99, title: 'Charter vote [or:obj-1]' })),
		})
		const wrapper = mount(CnPollsCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: '99' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-polls-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Charter vote')
		expect(chip.text()).toContain('Yes')
		wrapper.destroy()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnPollsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Polls is currently unavailable.')
		wrapper.destroy()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnPollsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No polls linked yet')
		wrapper.destroy()
		spy.mockRestore()
	})

	it('marks closed polls visually on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [makePoll({ id: 1, deadline: pastDeadline(2) })],
			}),
		})
		const wrapper = mount(CnPollsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-polls-card__row--closed').exists()).toBe(true)
		expect(wrapper.text()).toContain('Closed')
		wrapper.destroy()
	})
})

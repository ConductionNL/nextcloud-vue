/**
 * Tests for CnPollsTab — bespoke sidebar tab for the `polls` integration.
 *
 * Covers:
 *  - empty-state with "Open Polls" CTA when the provider returns no polls;
 *  - row rendering with per-option progress bars + percentages;
 *  - deadline-elapsed (closed) state shows "Closed";
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnPollsTab = require('../CnPollsTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function futureDeadline(daysAhead = 7) {
	return Math.floor((Date.now() + (daysAhead * 24 * 60 * 60 * 1000)) / 1000)
}

function pastDeadline(daysBehind = 2) {
	return Math.floor((Date.now() - (daysBehind * 24 * 60 * 60 * 1000)) / 1000)
}

function makePoll(overrides = {}) {
	return {
		id: 42,
		title: 'Approve the budget [or:obj-1]',
		description: 'Motion for the 2026 budget',
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

describe('CnPollsTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Polls" CTA when no polls', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No polls linked yet')
		expect(wrapper.text()).toContain('Open Polls')
		wrapper.destroy()
	})

	it('renders a row with option progress bars and vote counts', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makePoll()] }),
		})
		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-polls-tab__row')
		expect(rows).toHaveLength(1)
		// Title stripped of marker
		expect(wrapper.text()).toContain('Approve the budget')
		expect(wrapper.text()).not.toContain('[or:obj-1]')
		// Three option bars
		const bars = wrapper.findAll('.cn-polls-tab__option-bar')
		expect(bars).toHaveLength(3)
		// Percentages
		const txt = wrapper.text()
		expect(txt).toContain('Yes')
		expect(txt).toContain('No')
		expect(txt).toContain('Abstain')
		// 7/12 ≈ 58%, 3/12 = 25%, 2/12 ≈ 17%
		expect(txt).toContain('58%')
		expect(txt).toContain('25%')
		expect(txt).toContain('17%')
		wrapper.destroy()
	})

	it('strips a leading [or:{uuid}] marker (D-3 real-world fixture)', async () => {
		// Phase D-3 fixture: title = '[or:UUID] verification poll'
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				items: [
					{
						id: 2,
						title: '[or:1fc4dc2e-08f1-49bb-aca5-4d49a425a261] verification poll',
						description: '',
						type: 'textPoll',
						url: '/index.php/apps/polls/vote/2',
						deadline: null,
						closed: false,
						voterCount: 1,
						options: [{ id: 1, text: 'Option A', votes: 1 }],
					},
				],
			}),
		})
		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const title = wrapper.find('.cn-polls-tab__title')
		expect(title.exists()).toBe(true)
		expect(title.text()).toBe('verification poll')
		expect(title.text()).not.toContain('[or:')
		expect(title.text()).not.toContain('1fc4dc2e')
		wrapper.destroy()
	})

	it('shows "Closed" when the deadline has elapsed', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makePoll({ deadline: pastDeadline(3) })] }),
		})
		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Closed')
		expect(wrapper.find('.cn-polls-tab__row--closed').exists()).toBe(true)
		wrapper.destroy()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Polls is currently unavailable.')
		expect(wrapper.find('.cn-polls-tab__row').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load polls.')
		wrapper.destroy()
		spy.mockRestore()
	})

	it('still renders a row when the provider omits option-level results', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [{
					id: 7,
					title: 'Bare poll [or:obj-1]',
					description: '',
					type: 'datePoll',
					url: '/index.php/apps/polls/vote/7',
				}],
			}),
		})
		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-polls-tab__row')).toHaveLength(1)
		expect(wrapper.find('.cn-polls-tab__option').exists()).toBe(false)
		expect(wrapper.text()).toContain('Bare poll')
		wrapper.destroy()
	})

	it('opens the picker modal when "Link existing poll" is clicked', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.pickerOpen).toBe(false)
		wrapper.vm.openPicker()
		expect(wrapper.vm.pickerOpen).toBe(true)
		wrapper.destroy()
	})

	it('opens the create modal when "Create new poll" is clicked', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.createOpen).toBe(false)
		wrapper.vm.openCreate()
		expect(wrapper.vm.createOpen).toBe(true)
		wrapper.destroy()
	})

	it('POSTs to /polls when the picker emits link', async () => {
		// Initial list fetch then link POST then refresh.
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
			.mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve({ pollId: 99 }) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })

		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.onLinkPick({ pollId: 99 })

		const linkCall = global.fetch.mock.calls[1]
		expect(linkCall[0]).toContain('/api/objects/reg/schema/obj-1/polls')
		expect(linkCall[1].method).toBe('POST')
		expect(JSON.parse(linkCall[1].body)).toEqual({ pollId: 99 })
		wrapper.destroy()
	})

	it('surfaces a 409 error when linking a duplicate', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
			.mockResolvedValueOnce({ ok: false, status: 409, json: () => Promise.resolve({}) })

		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.onLinkPick({ pollId: 99 })

		expect(wrapper.vm.error).toContain('already linked')
		wrapper.destroy()
	})

	it('POSTs to /polls/new when the create dialog emits create', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
			.mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve({ pollId: 456 }) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })

		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const payload = {
			title: 'Lunch',
			description: 'Pick a day',
			type: 'datePoll',
			options: ['Mon', 'Tue'],
			deadline: null,
		}
		await wrapper.vm.onCreatePick(payload)

		const createCall = global.fetch.mock.calls[1]
		expect(createCall[0]).toContain('/api/objects/reg/schema/obj-1/polls/new')
		expect(createCall[1].method).toBe('POST')
		expect(JSON.parse(createCall[1].body)).toEqual(payload)
		wrapper.destroy()
	})

	it('DELETEs the link when unlinkPoll is called', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [makePoll()] }) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })

		const wrapper = mount(CnPollsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.unlinkPoll({ pollId: 42 })

		const deleteCall = global.fetch.mock.calls[1]
		expect(deleteCall[0]).toContain('/api/objects/reg/schema/obj-1/polls/42')
		expect(deleteCall[1].method).toBe('DELETE')
		wrapper.destroy()
	})
})

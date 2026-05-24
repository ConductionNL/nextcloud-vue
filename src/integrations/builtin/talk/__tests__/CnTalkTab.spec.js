/**
 * Tests for CnTalkTab — bespoke sidebar tab for the `talk` integration.
 *
 * Covers:
 *  - empty-state with "Open Talk" CTA when no linked rooms;
 *  - rendering linked rooms (title, unread badge, preview);
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws;
 *  - Tier-2 actions: Link / Create buttons + opening modals;
 *  - POST /talk on link pick;
 *  - POST /talk/new on create pick;
 *  - DELETE /talk/{token} on unlink.
 */

const { mount } = require('@vue/test-utils')
const CnTalkTab = require('../CnTalkTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makeRoom(overrides = {}) {
	return {
		id: 'r-1',
		roomToken: 'tok-1',
		roomName: 'Sprint planning',
		type: 2,
		participantCount: 4,
		lastActivity: '2026-05-23T10:00:00+00:00',
		url: '/index.php/call/tok-1',
		...overrides,
	}
}

describe('CnTalkTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Talk" CTA when no rooms', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No conversations linked yet')
		expect(wrapper.text()).toContain('Open Talk')
		wrapper.destroy()
	})

	it('renders linked rooms with title + unread badge', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeRoom({ roomToken: 'a', roomName: 'Alpha', unreadMessages: 3 }),
					makeRoom({ roomToken: 'b', roomName: 'Beta' }),
				],
			}),
		})
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-talk-tab__row')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Alpha')
		expect(wrapper.text()).toContain('Beta')
		const badges = wrapper.findAll('.cn-talk-tab__badge')
		expect(badges).toHaveLength(1)
		expect(badges.at(0).text()).toBe('3')
		wrapper.destroy()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Talk is currently unavailable.')
		wrapper.destroy()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load conversations.')
		wrapper.destroy()
		spy.mockRestore()
	})

	it('exposes Link and Create action buttons (Tier-2)', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Link existing room')
		expect(wrapper.text()).toContain('Create new room')
		wrapper.destroy()
	})

	it('opens the picker when "Link existing room" is clicked', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		wrapper.vm.openPicker()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.pickerOpen).toBe(true)
		wrapper.destroy()
	})

	it('opens the create dialog when "Create new room" is clicked', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		wrapper.vm.openCreate()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.createOpen).toBe(true)
		wrapper.destroy()
	})

	it('POSTs the link payload to /talk on link pick', async () => {
		const calls = []
		global.fetch = jest.fn().mockImplementation((url, opts) => {
			calls.push({ url, opts })
			return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		})
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.onPickerLink({ roomToken: 'tok-42' })
		const linkCall = calls.find(c => /\/talk$/.test(String(c.url)) && c.opts && c.opts.method === 'POST')
		expect(linkCall).toBeTruthy()
		expect(JSON.parse(linkCall.opts.body)).toEqual({ roomToken: 'tok-42' })
		wrapper.destroy()
	})

	it('POSTs the create payload to /talk/new on create submit', async () => {
		const calls = []
		global.fetch = jest.fn().mockImplementation((url, opts) => {
			calls.push({ url, opts })
			return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		})
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.onCreateSubmit({ name: 'Sprint', description: 'd', type: 2 })
		const createCall = calls.find(c => /\/talk\/new$/.test(String(c.url)) && c.opts && c.opts.method === 'POST')
		expect(createCall).toBeTruthy()
		expect(JSON.parse(createCall.opts.body)).toEqual({ name: 'Sprint', description: 'd', type: 2 })
		wrapper.destroy()
	})

	it('surfaces a 409 conflict as "already linked" when picking an existing room', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) }) // initial fetch
			.mockResolvedValueOnce({ ok: false, status: 409, json: () => Promise.resolve({}) }) // link POST
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.onPickerLink({ roomToken: 'dup' })
		expect(wrapper.vm.error).toContain('already linked')
		wrapper.destroy()
	})

	it('DELETEs /talk/{token} on unlink', async () => {
		const calls = []
		global.fetch = jest.fn().mockImplementation((url, opts) => {
			calls.push({ url, opts })
			return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		})
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.unlinkRoom({ roomToken: 'tok-x' })
		const delCall = calls.find(c => /\/talk\/tok-x$/.test(String(c.url)) && c.opts && c.opts.method === 'DELETE')
		expect(delCall).toBeTruthy()
		wrapper.destroy()
	})
})

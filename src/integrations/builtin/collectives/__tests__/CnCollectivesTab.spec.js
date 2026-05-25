/**
 * Tests for CnCollectivesTab — bespoke sidebar tab for the `collectives`
 * integration.
 *
 * Covers:
 *  - empty-state with "Open Knowledge" CTA when the provider returns no rows;
 *  - row rendering: title, emoji, content snippet, collective group header;
 *  - the `[or:{uuid}]` marker is stripped from a slug-as-title fallback;
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnCollectivesTab = require('../CnCollectivesTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makePage(overrides = {}) {
	return {
		id: 1,
		title: 'Onboarding handbook',
		url: '/index.php/apps/collectives/team/onboarding-handbook',
		data: {
			id: 1,
			slug: 'onboarding-handbook',
			emoji: '📘',
			last_user_id: 'alice',
		},
		...overrides,
	}
}

describe('CnCollectivesTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Knowledge" CTA when no pages', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No Knowledge pages linked yet')
		expect(wrapper.text()).toContain('Open Knowledge')
		wrapper.destroy()
	})

	it('renders one row per page with title and emoji', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePage({ id: 1, title: 'Alpha page', data: { id: 1, slug: 'alpha', emoji: '📘' } }),
					makePage({ id: 2, title: 'Bravo page', data: { id: 2, slug: 'bravo', emoji: '🗂️' } }),
				],
			}),
		})
		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-collectives-tab__row')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Alpha page')
		expect(wrapper.text()).toContain('Bravo page')
		expect(wrapper.text()).toContain('📘')
		expect(wrapper.text()).toContain('🗂️')
		wrapper.destroy()
	})

	it('groups pages by collective name when the field is present', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePage({ id: 1, title: 'Alpha', collectiveId: 'team', collectiveName: 'Team Wiki' }),
					makePage({ id: 2, title: 'Bravo', collectiveId: 'team', collectiveName: 'Team Wiki' }),
					makePage({ id: 3, title: 'Charlie', collectiveId: 'ops', collectiveName: 'Ops Runbook' }),
				],
			}),
		})
		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const groups = wrapper.findAll('.cn-collectives-tab__group')
		expect(groups).toHaveLength(2)
		const headers = wrapper.findAll('.cn-collectives-tab__group-header').wrappers.map((h) => h.text())
		expect(headers).toContain('Team Wiki')
		expect(headers).toContain('Ops Runbook')
		wrapper.destroy()
	})

	it('strips the [or:{uuid}] marker from a slug-as-title fallback', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					// provider returned slug-as-title with the marker
					{ id: 42, title: 'release-notes [or:obj-1]', url: '/index.php/apps/collectives/42', data: { id: 42 } },
				],
			}),
		})
		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const titleEl = wrapper.find('.cn-collectives-tab__title')
		expect(titleEl.exists()).toBe(true)
		expect(titleEl.text()).toBe('release-notes')
		expect(titleEl.text()).not.toContain('[or:')
		wrapper.destroy()
	})

	it('trims a dangling slug separator left behind after marker strip (D-1 fixture)', async () => {
		// Phase D-1 fixture: slug = 'phase-d1-page-[or:UUID]'. After
		// the marker is stripped what remains is 'phase-d1-page-' with
		// a trailing hyphen — the bug. Fix trims dangling -, _, .
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					{
						id: 42,
						title: 'phase-d1-page-[or:a270fe68-df45-4427-8cb9-3c33eefc2e88]',
						url: '/index.php/apps/collectives/42',
						data: { id: 42 },
					},
				],
			}),
		})
		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const titleEl = wrapper.find('.cn-collectives-tab__title')
		expect(titleEl.exists()).toBe(true)
		expect(titleEl.text()).toBe('phase-d1-page')
		expect(titleEl.text()).not.toContain('[or:')
		expect(titleEl.text()).not.toMatch(/-$/)
		wrapper.destroy()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Knowledge is currently unavailable.')
		expect(wrapper.find('.cn-collectives-tab__row').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load Knowledge pages.')
		wrapper.destroy()
		spy.mockRestore()
	})

	it('renders the Tier-2 link/create action buttons', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Link existing page')
		expect(wrapper.text()).toContain('Create new page')
		wrapper.destroy()
	})

	it('POSTs the picked page to the Tier-2 collectives endpoint on link', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
			.mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve({}) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })

		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.onLinkPick({ pageId: 77 })
		await wrapper.vm.$nextTick()

		const postCall = global.fetch.mock.calls[1]
		expect(postCall[0]).toBe('/apps/openregister/api/objects/reg/schema/obj-1/collectives')
		expect(postCall[1].method).toBe('POST')
		expect(JSON.parse(postCall[1].body)).toEqual({ pageId: 77 })
		wrapper.destroy()
	})

	it('POSTs the create payload to the /new endpoint on create', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
			.mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve({}) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })

		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.onCreatePick({ collectiveId: 3, title: 'New page' })
		await wrapper.vm.$nextTick()

		const postCall = global.fetch.mock.calls[1]
		expect(postCall[0]).toBe('/apps/openregister/api/objects/reg/schema/obj-1/collectives/new')
		expect(postCall[1].method).toBe('POST')
		expect(JSON.parse(postCall[1].body)).toEqual({ collectiveId: 3, title: 'New page' })
		wrapper.destroy()
	})

	it('DELETEs the page on unlink', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ results: [{ pageId: 55, pageTitle: 'Runbook', collectiveName: 'Ops' }] }),
			})
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })

		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.unlinkPage({ pageId: 55 })
		await wrapper.vm.$nextTick()

		const delCall = global.fetch.mock.calls[1]
		expect(delCall[0]).toBe('/apps/openregister/api/objects/reg/schema/obj-1/collectives/55')
		expect(delCall[1].method).toBe('DELETE')
		wrapper.destroy()
	})

	it('renders the Tier-2 link-row shape (pageTitle + collectiveName)', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					{ pageId: 10, pageTitle: 'Runbook', collectiveId: 1, collectiveName: 'Ops', emoji: '📕', url: '/index.php/apps/collectives/?fileId=10' },
				],
			}),
		})
		const wrapper = mount(CnCollectivesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-collectives-tab__title').text()).toBe('Runbook')
		expect(wrapper.text()).toContain('Ops')
		wrapper.destroy()
	})
})

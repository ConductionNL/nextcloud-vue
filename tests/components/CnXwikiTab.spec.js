/**
 * Tests for CnXwikiTab — the XWiki "Articles" sidebar tab.
 *
 * Covers: list fetch on mount + breadcrumb rendering, link-by-URL
 * (POST), unlink (DELETE), the empty state, the 503 → reconnect/
 * unavailable banner path, and that unlink never deletes the page in
 * XWiki (it only DELETEs the OR sub-resource pairing).
 */

const { mount } = require('@vue/test-utils')
const flushPromises = () => new Promise((r) => setTimeout(r, 0))
const CnXwikiTab = require('../../src/components/CnXwikiTab/CnXwikiTab.vue').default

const baseProps = { objectId: 'obj-1', register: 'reg', schema: 'sch', apiBase: '/apps/openregister/api' }

function jsonResponse(body, ok = true, status = 200) {
	return { ok, status, json: () => Promise.resolve(body) }
}

describe('CnXwikiTab', () => {
	beforeEach(() => { global.fetch = jest.fn() })
	afterEach(() => { delete global.fetch })

	it('renders linked pages with breadcrumbs on mount', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse({
			results: [
				{ id: 'Dept.Legal.Handbook', title: 'Handbook', breadcrumb: ['Wiki', 'Dept', 'Legal', 'Handbook'], url: 'https://wiki/x' },
				{ id: 'Sales.Pitch', title: 'Pitch', space: 'Sales' },
			],
		}))
		const wrapper = mount(CnXwikiTab, { propsData: baseProps })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-xwiki-tab__row')).toHaveLength(2)
		expect(wrapper.text()).toContain('Handbook')
		// breadcrumb drops the last element (the title itself)
		expect(wrapper.text()).toContain('Wiki / Dept / Legal')
		expect(wrapper.text()).toContain('Sales')
		wrapper.destroy()
	})

	it('shows the empty state when no pages are linked', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse({ results: [] }))
		const wrapper = mount(CnXwikiTab, { propsData: baseProps })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No linked articles')
		wrapper.destroy()
	})

	it('accepts the OpenRegister sub-resource `{ items: [...] }` envelope', async () => {
		// ObjectIntegrationsController wraps the list under `items`, not `results`.
		global.fetch.mockResolvedValueOnce(jsonResponse({
			items: [{ id: 'Sandbox.IntegrationTest', title: 'Integration Test Page', space: 'Sandbox', url: 'https://wiki/bin/view/Sandbox/IntegrationTest' }],
		}))
		const wrapper = mount(CnXwikiTab, { propsData: baseProps })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-xwiki-tab__row')).toHaveLength(1)
		expect(wrapper.text()).toContain('Integration Test Page')
		wrapper.destroy()
	})

	it('links a page by URL via POST and refreshes the list', async () => {
		global.fetch
			.mockResolvedValueOnce(jsonResponse({ results: [] }))            // initial fetch
			.mockResolvedValueOnce(jsonResponse({ id: 'X.Y', title: 'Y' }))  // POST
			.mockResolvedValueOnce(jsonResponse({ results: [{ id: 'X.Y', title: 'Y', space: 'X' }] })) // refresh
		const wrapper = mount(CnXwikiTab, { propsData: baseProps })
		await flushPromises()
		wrapper.vm.linkInput = 'https://wiki.example.org/bin/view/X/Y'
		await wrapper.vm.submitLink()
		await flushPromises()
		await wrapper.vm.$nextTick()
		// the POST was made with { reference }
		const postCall = global.fetch.mock.calls.find((c) => c[1] && c[1].method === 'POST')
		expect(postCall).toBeTruthy()
		expect(JSON.parse(postCall[1].body)).toEqual({ reference: 'https://wiki.example.org/bin/view/X/Y' })
		expect(wrapper.emitted('linked')).toBeTruthy()
		expect(wrapper.text()).toContain('Y')
		wrapper.destroy()
	})

	it('unlinks a page via DELETE on the OR sub-resource (does not delete in XWiki)', async () => {
		global.fetch
			.mockResolvedValueOnce(jsonResponse({ results: [{ id: 'X.Y', title: 'Y', space: 'X' }] }))
			.mockResolvedValueOnce(jsonResponse({}))  // DELETE
		const wrapper = mount(CnXwikiTab, { propsData: baseProps })
		await flushPromises()
		await wrapper.vm.$nextTick()
		await wrapper.vm.unlink({ id: 'X.Y' })
		await flushPromises()
		await wrapper.vm.$nextTick()
		const delCall = global.fetch.mock.calls.find((c) => c[1] && c[1].method === 'DELETE')
		expect(delCall).toBeTruthy()
		expect(delCall[0]).toContain('/objects/reg/sch/obj-1/integrations/xwiki/X.Y')
		expect(wrapper.emitted('unlinked')).toBeTruthy()
		expect(wrapper.findAll('.cn-xwiki-tab__row')).toHaveLength(0)
		wrapper.destroy()
	})

	it('shows a reconnect banner when the endpoint answers 503 with an auth cause', async () => {
		// ObjectIntegrationsController surfaces the cause under details.cause.
		global.fetch.mockResolvedValueOnce(jsonResponse(
			{ message: 'OpenConnector source "xwiki" is missing or unreadable.', details: { cause: 'openconnector-source-missing' } },
			false, 503,
		))
		const wrapper = mount(CnXwikiTab, { propsData: baseProps })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-xwiki-tab__banner').exists()).toBe(true)
		expect(wrapper.text()).toContain('re-connect')
		wrapper.destroy()
	})

	it('still honours the legacy details.reason shape for the reconnect banner', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse(
			{ message: 'token refresh failed', details: { reason: 'openconnector-source-missing' } },
			false, 503,
		))
		const wrapper = mount(CnXwikiTab, { propsData: baseProps })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('re-connect')
		wrapper.destroy()
	})

	it('shows a generic unavailable banner on a 503 without an auth reason', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse({ message: 'upstream down', details: { reason: 'upstream-service-down' } }, false, 503))
		const wrapper = mount(CnXwikiTab, { propsData: baseProps })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-xwiki-tab__banner').exists()).toBe(true)
		expect(wrapper.text()).toContain('not reachable')
		wrapper.destroy()
	})
})

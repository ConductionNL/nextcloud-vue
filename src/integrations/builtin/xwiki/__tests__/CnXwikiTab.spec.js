/**
 * Tests for CnXwikiTab — bespoke sidebar tab for the `xwiki` external integration.
 *
 * Covers:
 *  - empty-state when the provider returns no pages;
 *  - row rendering with breadcrumb (ancestors only — title is dropped) and modified-meta;
 *  - **unconfigured** state: 503 + cause `openconnector-source-missing` → "Configure XWiki connection" CTA;
 *  - **unconfigured** state: 503 + cause `openconnector-down` → same CTA;
 *  - **auth-failure** state: 503 + cause `provider-auth` → "Reconnect" CTA + 401 message;
 *  - **upstream-error** state: 503 + cause `upstream-service-down` → "Retry" CTA + unavailable message;
 *  - generic-error fallback when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnXwikiTab = require('../CnXwikiTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makePage(overrides = {}) {
	return {
		id: 'Knowledge.PolicyManual',
		reference: 'Knowledge.PolicyManual',
		title: 'Policy Manual',
		space: 'Knowledge',
		page: 'PolicyManual',
		breadcrumb: ['Wiki', 'Knowledge', 'Policy Manual'],
		url: 'https://wiki.example.org/bin/view/Knowledge/PolicyManual',
		modified: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString(),
		...overrides,
	}
}

function unavailable(cause) {
	return {
		ok: false,
		status: 503,
		json: () => Promise.resolve({
			message: 'unavailable',
			code: 503,
			details: { cause },
		}),
	}
}

describe('CnXwikiTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state when no pages are linked', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnXwikiTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No XWiki pages linked yet')
		expect(wrapper.find('.cn-xwiki-tab__row').exists()).toBe(false)
		expect(wrapper.find('.cn-xwiki-tab__banner').exists()).toBe(false)
		wrapper.unmount()
	})

	it('renders an XWiki-style row with title, breadcrumb (chevron, ancestors only), last-modified and excerpt', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [makePage({ content: '<p>The official <strong>policy</strong> manual.</p>' })],
			}),
		})
		const wrapper = mount(CnXwikiTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-xwiki-tab__row')
		expect(rows).toHaveLength(1)
		// Title is passed to NcListItem via the `name` prop (rendered as the `name` attribute).
		expect(rows.at(0).attributes('name')).toBe('Policy Manual')
		// Breadcrumb drops the last element (title) and joins ancestors with a chevron.
		expect(wrapper.find('.cn-xwiki-tab__breadcrumb').text()).toBe('Wiki › Knowledge')
		// Last-modified rendered through NcDateTime (relative time present in the row).
		expect(wrapper.find('.cn-xwiki-tab__date').exists()).toBe(true)
		// One-line plain-text excerpt — HTML stripped, macros stay inert.
		expect(wrapper.find('.cn-xwiki-tab__excerpt').text()).toBe('The official policy manual.')
		// Row deep-links to the external XWiki URL (NcListItem renders an
		// anchor from its `href`/`target` props at runtime).
		expect(rows.at(0).attributes('href')).toBe('https://wiki.example.org/bin/view/Knowledge/PolicyManual')
		expect(rows.at(0).attributes('target')).toBe('_blank')
		wrapper.unmount()
	})

	it('shows the "Configure XWiki connection" CTA when the OpenConnector source is missing', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(unavailable('openconnector-source-missing'))
		const wrapper = mount(CnXwikiTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const banner = wrapper.find('.cn-xwiki-tab__banner')
		expect(banner.exists()).toBe(true)
		expect(banner.classes()).toContain('cn-xwiki-tab__banner--unconfigured')
		expect(wrapper.text()).toContain('XWiki connection not configured')
		expect(wrapper.text()).toContain('Configure XWiki connection')
		// No rows fall through.
		expect(wrapper.find('.cn-xwiki-tab__row').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the unconfigured banner when OpenConnector itself is down', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(unavailable('openconnector-down'))
		const wrapper = mount(CnXwikiTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const banner = wrapper.find('.cn-xwiki-tab__banner')
		expect(banner.exists()).toBe(true)
		expect(banner.classes()).toContain('cn-xwiki-tab__banner--unconfigured')
		expect(wrapper.text()).toContain('Configure XWiki connection')
		wrapper.unmount()
	})

	it('shows the auth-failure banner with a Reconnect CTA when the source credentials are bad', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(unavailable('provider-auth'))
		const wrapper = mount(CnXwikiTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const banner = wrapper.find('.cn-xwiki-tab__banner')
		expect(banner.exists()).toBe(true)
		expect(banner.classes()).toContain('cn-xwiki-tab__banner--auth')
		expect(wrapper.text()).toContain('XWiki authentication failed')
		expect(wrapper.text()).toContain('XWiki returned 401')
		expect(wrapper.text()).toContain('Reconnect')
		wrapper.unmount()
	})

	it('shows the upstream-unavailable banner with a Retry CTA when XWiki itself is down', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(unavailable('upstream-service-down'))
		const wrapper = mount(CnXwikiTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const banner = wrapper.find('.cn-xwiki-tab__banner')
		expect(banner.exists()).toBe(true)
		expect(banner.classes()).toContain('cn-xwiki-tab__banner--upstream')
		expect(wrapper.text()).toContain('XWiki is currently unavailable')
		expect(wrapper.text()).toContain('Retry')
		wrapper.unmount()
	})

	it('shows the generic error banner when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('network boom'))
		const wrapper = mount(CnXwikiTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const banner = wrapper.find('.cn-xwiki-tab__banner')
		expect(banner.exists()).toBe(true)
		expect(banner.classes()).toContain('cn-xwiki-tab__banner--error')
		expect(wrapper.text()).toContain('Could not load XWiki pages')
		wrapper.unmount()
		spy.mockRestore()
	})
})

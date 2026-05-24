/**
 * Tests for CnXwikiCard — bespoke surface-aware widget for the `xwiki` integration.
 *
 * Covers:
 *  - dashboard surface: count headline + most-recent + Configured badge;
 *  - dashboard surface: "Not configured" badge when source is missing;
 *  - dashboard surface: "Auth failed" badge on 503 provider-auth;
 *  - detail-page surface: macro-inert text preview (script/style stripped, tags removed, ~500-char truncation);
 *  - detail-page surface: "Open in XWiki" link;
 *  - detail-page surface: unavailable banner on 503;
 *  - single-entity surface: chip with title + breadcrumb;
 *  - single-entity surface: fallback chip showing the raw `value` on lookup failure.
 */

const { mount } = require('@vue/test-utils')
const CnXwikiCard = require('../CnXwikiCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
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
		modified: new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString(),
		content: '<p>This is a short policy summary.</p>',
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

describe('CnXwikiCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	describe('dashboard surface', () => {
		it('renders count headline + most-recent page + Configured badge on user-dashboard', async () => {
			global.fetch = jest.fn().mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ results: [makePage(), makePage({ id: 'X.A', reference: 'X.A', title: 'Page A', modified: new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString() })] }),
			})
			const wrapper = mount(CnXwikiCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			const text = wrapper.text()
			expect(text).toContain('2 linked pages')
			// Most-recent = the 2-hours-old one (Policy Manual), not the 24-hours-old one.
			expect(text).toContain('Policy Manual')
			// Auth badge says Configured.
			const badge = wrapper.find('.cn-xwiki-card__auth-badge')
			expect(badge.exists()).toBe(true)
			expect(badge.text()).toBe('Configured')
			expect(badge.classes()).toContain('cn-xwiki-card__auth-badge--configured')
			wrapper.destroy()
		})

		it('shows "Not configured" badge on dashboard when OpenConnector source is missing', async () => {
			global.fetch = jest.fn().mockResolvedValueOnce(unavailable('openconnector-source-missing'))
			const wrapper = mount(CnXwikiCard, { propsData: { ...DEFAULT_PROPS, surface: 'app-dashboard' } })
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			const badge = wrapper.find('.cn-xwiki-card__auth-badge')
			expect(badge.exists()).toBe(true)
			expect(badge.text()).toBe('Not configured')
			expect(badge.classes()).toContain('cn-xwiki-card__auth-badge--missing')
			expect(wrapper.text()).toContain('Not configured')
			wrapper.destroy()
		})

		it('shows "Auth failed" badge on dashboard when credentials are bad', async () => {
			global.fetch = jest.fn().mockResolvedValueOnce(unavailable('provider-auth'))
			const wrapper = mount(CnXwikiCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			const badge = wrapper.find('.cn-xwiki-card__auth-badge')
			expect(badge.exists()).toBe(true)
			expect(badge.text()).toBe('Auth failed')
			expect(badge.classes()).toContain('cn-xwiki-card__auth-badge--unhealthy')
			wrapper.destroy()
		})
	})

	describe('detail-page surface', () => {
		it('renders the macro-inert text preview with all HTML stripped and ~500-char truncation', async () => {
			const macroBody = '<script>alert(1)</script>'
				+ '<style>body{color:red}</style>'
				+ '<p>{{velocity}}#set($x="evil"){{/velocity}}</p>'
				+ '<p>' + 'lorem ipsum '.repeat(60) + '</p>'
			global.fetch = jest.fn().mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ results: [makePage({ content: macroBody })] }),
			})
			const wrapper = mount(CnXwikiCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			const preview = wrapper.find('.cn-xwiki-card__preview p')
			expect(preview.exists()).toBe(true)
			const text = preview.text()
			// Script body removed.
			expect(text).not.toContain('alert(1)')
			// Style body removed.
			expect(text).not.toContain('color:red')
			// Tags stripped.
			expect(text).not.toMatch(/<[^>]+>/)
			// Macro markup is inert text (preserved, not executed).
			expect(text).toContain('{{velocity}}')
			// Truncated with ellipsis (the lorem body alone is ~720 chars).
			expect(text.length).toBeLessThanOrEqual(501)
			expect(text.endsWith('…')).toBe(true)
			wrapper.destroy()
		})

		it('renders the "Open in XWiki" link pointing at the first page URL', async () => {
			global.fetch = jest.fn().mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ results: [makePage()] }),
			})
			const wrapper = mount(CnXwikiCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			const link = wrapper.find('a.cn-xwiki-card__open-link')
			expect(link.exists()).toBe(true)
			expect(link.text()).toBe('Open in XWiki')
			expect(link.attributes('href')).toBe('https://wiki.example.org/bin/view/Knowledge/PolicyManual')
			expect(link.attributes('target')).toBe('_blank')
			wrapper.destroy()
		})

		it('shows the unconfigured banner on detail-page when source is missing', async () => {
			global.fetch = jest.fn().mockResolvedValueOnce(unavailable('openconnector-source-missing'))
			const wrapper = mount(CnXwikiCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			const banner = wrapper.find('.cn-xwiki-card__banner')
			expect(banner.exists()).toBe(true)
			expect(banner.classes()).toContain('cn-xwiki-card__banner--unconfigured')
			expect(wrapper.text()).toContain('XWiki connection not configured')
			wrapper.destroy()
		})
	})

	describe('single-entity surface', () => {
		it('renders a chip with title + breadcrumb when the lookup succeeds', async () => {
			global.fetch = jest.fn().mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve(makePage()),
			})
			const wrapper = mount(CnXwikiCard, {
				propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: 'Knowledge.PolicyManual' },
			})
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			const chip = wrapper.find('.cn-xwiki-card__chip')
			expect(chip.exists()).toBe(true)
			expect(chip.classes()).not.toContain('cn-xwiki-card__chip--fallback')
			expect(chip.text()).toContain('Policy Manual')
			expect(chip.text()).toContain('Wiki / Knowledge')
			wrapper.destroy()
		})

		it('falls back to a minimal chip showing the raw value when lookup fails', async () => {
			global.fetch = jest.fn().mockResolvedValueOnce(unavailable('upstream-service-down'))
			const wrapper = mount(CnXwikiCard, {
				propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: 'Knowledge.PolicyManual' },
			})
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			await wrapper.vm.$nextTick()
			const chip = wrapper.find('.cn-xwiki-card__chip--fallback')
			expect(chip.exists()).toBe(true)
			expect(chip.text()).toContain('Knowledge.PolicyManual')
			wrapper.destroy()
		})
	})
})

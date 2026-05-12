/**
 * Tests for CnXwikiCard — the surface-aware XWiki "Articles" widget.
 *
 * Covers: list rendering on the compact surfaces, the detail-page
 * text preview (HTML stripped to text, truncated to ~500 chars, NO
 * macro execution), the single-entity chip resolved from `value`,
 * the maxDisplay cap, the empty state, and the 503 → quiet
 * unavailable state.
 */

const { mount } = require('@vue/test-utils')
const flushPromises = () => new Promise((r) => setTimeout(r, 0))
const CnXwikiCard = require('../../src/components/CnXwikiCard/CnXwikiCard.vue').default

const ctx = { register: 'reg', schema: 'sch', objectId: 'obj-1', apiBase: '/apps/openregister/api' }

function jsonResponse(body, ok = true, status = 200) {
	return { ok, status, json: () => Promise.resolve(body) }
}

describe('CnXwikiCard', () => {
	beforeEach(() => { global.fetch = jest.fn() })
	afterEach(() => { delete global.fetch })

	it('renders a compact list on the app-dashboard surface', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse({
			results: [{ id: 'A.B', title: 'B', space: 'A' }, { id: 'C.D', title: 'D', space: 'C' }],
		}))
		const wrapper = mount(CnXwikiCard, { propsData: { ...ctx, surface: 'app-dashboard' } })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-xwiki-card__row')).toHaveLength(2)
		expect(wrapper.find('.cn-xwiki-card__preview').exists()).toBe(false)
		wrapper.destroy()
	})

	it('caps the list at maxDisplay', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse({
			results: new Array(8).fill(null).map((_, i) => ({ id: `S.P${i}`, title: `P${i}`, space: 'S' })),
		}))
		const wrapper = mount(CnXwikiCard, { propsData: { ...ctx, surface: 'user-dashboard', maxDisplay: 3 } })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-xwiki-card__row')).toHaveLength(3)
		wrapper.destroy()
	})

	it('renders a TEXT preview on the detail-page surface — HTML stripped, macros not executed', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse({
			results: [{
				id: 'Docs.Home', title: 'Home', space: 'Docs', url: 'https://wiki/Docs/Home',
				content: '<h1>Welcome</h1><script>alert(1)</script><p>This is the <strong>handbook</strong>. {{velocity}}$xwiki.getDocument{{/velocity}}</p>',
			}],
		}))
		const wrapper = mount(CnXwikiCard, { propsData: { ...ctx, surface: 'detail-page' } })
		await flushPromises()
		await wrapper.vm.$nextTick()
		const preview = wrapper.find('.cn-xwiki-card__preview-text')
		expect(preview.exists()).toBe(true)
		const text = preview.text()
		// HTML tags are gone; the <script> body is removed; the macro
		// markup is treated as inert text (never executed).
		expect(text).toContain('Welcome')
		expect(text).toContain('handbook')
		expect(text).not.toContain('<')
		expect(text).not.toContain('alert(1)')
		// link to the full page is present
		expect(wrapper.find('.cn-xwiki-card__preview-link').attributes('href')).toBe('https://wiki/Docs/Home')
		wrapper.destroy()
	})

	it('truncates the preview to ~500 chars', async () => {
		const long = 'x'.repeat(2000)
		global.fetch.mockResolvedValueOnce(jsonResponse({ results: [{ id: 'A.B', title: 'B', content: `<p>${long}</p>` }] }))
		const wrapper = mount(CnXwikiCard, { propsData: { ...ctx, surface: 'detail-page' } })
		await flushPromises()
		await wrapper.vm.$nextTick()
		const text = wrapper.find('.cn-xwiki-card__preview-text').text()
		// 500 chars + the ellipsis
		expect(text.length).toBeLessThanOrEqual(502)
		expect(text.endsWith('…')).toBe(true)
		wrapper.destroy()
	})

	it('renders a chip on the single-entity surface, resolved from value', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse({
			id: 'Team.Charter', title: 'Charter', space: 'Team', breadcrumb: ['Wiki', 'Team', 'Charter'], url: 'https://wiki/Team/Charter',
		}))
		const wrapper = mount(CnXwikiCard, { propsData: { ...ctx, surface: 'single-entity', value: 'Team.Charter' } })
		await flushPromises()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-xwiki-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Charter')
		expect(chip.text()).toContain('Wiki / Team')
		// the GET was for the encoded reference
		expect(global.fetch.mock.calls[0][0]).toContain('/objects/reg/sch/obj-1/xwiki/Team.Charter')
		wrapper.destroy()
	})

	it('single-entity falls back to a minimal chip from the reference when the lookup fails', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse({}, false, 404))
		const wrapper = mount(CnXwikiCard, { propsData: { ...ctx, surface: 'single-entity', value: 'Lone.Page' } })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-xwiki-card__chip').text()).toContain('Lone.Page')
		wrapper.destroy()
	})

	it('shows a quiet unavailable state on a 503', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse({ message: 'down' }, false, 503))
		const wrapper = mount(CnXwikiCard, { propsData: { ...ctx, surface: 'detail-page' } })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('not reachable')
		expect(wrapper.find('.cn-xwiki-card__row').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the empty state when nothing is linked', async () => {
		global.fetch.mockResolvedValueOnce(jsonResponse({ results: [] }))
		const wrapper = mount(CnXwikiCard, { propsData: { ...ctx, surface: 'detail-page' } })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No linked articles')
		wrapper.destroy()
	})
})

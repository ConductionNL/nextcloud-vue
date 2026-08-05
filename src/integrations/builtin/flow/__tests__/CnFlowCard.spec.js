/**
 * Tests for CnFlowCard — bespoke surface-aware widget for the `flow`
 * (automation) integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: count headline + most-recent line
 *    with the entity binding;
 *  - detail-page: list with per-row entity / operation summary +
 *    enabled dot;
 *  - single-entity: chip with operation name + enabled dot.
 * Plus error / unavailable / admin-only handling that mirrors
 * CnIntegrationCard.
 */

const { mount } = require('@vue/test-utils')
const CnFlowCard = require('../CnFlowCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function makeOp(overrides = {}) {
	return {
		id: '7',
		title: 'Auto-tag new uploads',
		class: 'OCA\\WorkflowEngine\\Operation\\GenericOperation',
		entity: 'OCA\\WorkflowEngine\\Entity\\File',
		operation: 'tag',
		hasMarker: false,
		url: '/index.php/settings/admin/workflow',
		data: {
			id: 7,
			class: 'OCA\\WorkflowEngine\\Operation\\GenericOperation',
			name: 'Auto-tag new uploads',
			entity: 'OCA\\WorkflowEngine\\Entity\\File',
			events: ['OCA\\WorkflowEngine\\Entity\\File::postCreate'],
			operation: 'tag',
			checks: [{ class: 'X', operator: 'matches', value: '.*' }],
		},
		...overrides,
	}
}

describe('CnFlowCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked operations', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnFlowCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No automations linked yet')
		wrapper.unmount()
	})

	it('renders a count headline + most-recent line on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeOp({ id: '1', title: 'Rule A' }),
					makeOp({ id: '2', title: 'Rule B' }),
				],
			}),
		})
		const wrapper = mount(CnFlowCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		expect(txt).toContain('2')
		expect(txt).toContain('Rule A')
		expect(txt).toContain('File')
		expect(wrapper.find('.cn-flow-card__headline').exists()).toBe(true)
		wrapper.unmount()
	})

	it('shows a "N automations · M active" headline when some are disabled', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeOp({ id: '1', title: 'Rule A' }),
					makeOp({ id: '2', title: 'Rule B', enabled: false }),
				],
			}),
		})
		const wrapper = mount(CnFlowCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text().toLowerCase()
		expect(txt).toContain('active')
		wrapper.unmount()
	})

	it('renders a list of rows with entity / operation meta on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeOp({ id: '1', title: 'Rule A' }),
					makeOp({ id: '2', title: 'Rule B' }),
				],
			}),
		})
		const wrapper = mount(CnFlowCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-flow-card__row')
		expect(rows).toHaveLength(2)
		expect(wrapper.findAll('.cn-flow-card__enabled--on').length).toBe(2)
		expect(wrapper.text()).toContain('File')
		expect(wrapper.text()).toContain('tag')
		expect(wrapper.text()).toContain('1 conditions')
		wrapper.unmount()
	})

	it('renders a chip on the single-entity surface with an enabled dot', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeOp({ id: '99', title: 'Approve uploads' })),
		})
		const wrapper = mount(CnFlowCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: '99' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-flow-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Approve uploads')
		expect(wrapper.find('.cn-flow-card__enabled--on').exists()).toBe(true)
		wrapper.unmount()
	})

	it('shows the admin-only banner when the provider returns 403', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 403, json: () => Promise.resolve({}) })
		const wrapper = mount(CnFlowCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Flow operations are only visible to administrators.')
		wrapper.unmount()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnFlowCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Flow is currently unavailable.')
		wrapper.unmount()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnFlowCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No automations linked yet')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('marks disabled operations visually on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [makeOp({ id: '1', enabled: false })],
			}),
		})
		const wrapper = mount(CnFlowCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-flow-card__row--disabled').exists()).toBe(true)
		expect(wrapper.find('.cn-flow-card__enabled--off').exists()).toBe(true)
		wrapper.unmount()
	})
})

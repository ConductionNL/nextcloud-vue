/**
 * Tests for CnFlowTab — bespoke sidebar tab for the `flow`
 * (automation) integration.
 *
 * Covers:
 *  - empty-state with "Open Flow settings" CTA when the provider
 *    returns no operations;
 *  - row rendering with title, entity / operation summary, and an
 *    enabled indicator;
 *  - trigger-event chips populated from `data.events`;
 *  - condition count populated from `data.checks`;
 *  - 403 admin-only path (NC Flow is admin-gated);
 *  - 503 unavailable degradation;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnFlowTab = require('../CnFlowTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
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
			checks: [
				{ class: 'OCA\\WorkflowEngine\\Check\\FileMimeType', operator: 'matches', value: 'image/.*' },
			],
		},
		...overrides,
	}
}

describe('CnFlowTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Flow settings" CTA when no operations', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No automations linked yet')
		expect(wrapper.text()).toContain('Open Flow settings')
		wrapper.destroy()
	})

	it('renders a row with title, entity and operation summary', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeOp()] }),
		})
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-flow-tab__row')
		expect(rows).toHaveLength(1)
		expect(wrapper.text()).toContain('Auto-tag new uploads')
		// Entity class shortened
		expect(wrapper.text()).toContain('Entity:')
		expect(wrapper.text()).toContain('File')
		// Operation kind
		expect(wrapper.text()).toContain('Operation:')
		expect(wrapper.text()).toContain('tag')
		// Enabled-by-default
		expect(wrapper.find('.cn-flow-tab__enabled--on').exists()).toBe(true)
		expect(wrapper.text()).toContain('Enabled')
		wrapper.destroy()
	})

	it('renders trigger-event chips shortened to the method name', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeOp()] }),
		})
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chips = wrapper.findAll('.cn-flow-tab__chip')
		expect(chips.length).toBeGreaterThan(0)
		expect(chips.at(0).text()).toBe('postCreate')
		wrapper.destroy()
	})

	it('renders a condition count when checks are present', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeOp()] }),
		})
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('1 conditions')
		wrapper.destroy()
	})

	it('marks operations with explicit enabled:false as disabled', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeOp({ enabled: false })] }),
		})
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-flow-tab__row--disabled').exists()).toBe(true)
		expect(wrapper.find('.cn-flow-tab__enabled--off').exists()).toBe(true)
		expect(wrapper.text()).toContain('Disabled')
		wrapper.destroy()
	})

	it('shows the admin-only banner when the provider returns 403', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 403, json: () => Promise.resolve({}) })
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Flow operations are only visible to administrators.')
		wrapper.destroy()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Flow is currently unavailable.')
		expect(wrapper.find('.cn-flow-tab__row').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load automations.')
		wrapper.destroy()
		spy.mockRestore()
	})

	it('falls back to the shortened class name when title is absent', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeOp({ title: '', data: { ...makeOp().data, name: '' } })] }),
		})
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('GenericOperation')
		wrapper.destroy()
	})
})

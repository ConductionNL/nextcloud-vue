/**
 * Tests for CnFlowTab — bespoke sidebar tab for the `flow`
 * (automation) integration. Tier-2: link-table + admin-only
 * link/unlink controls.
 *
 * Covers:
 *  - empty-state with "Open Workflow settings" CTA when the endpoint
 *    returns no operations;
 *  - row rendering with title, entity / operation summary, enabled
 *    indicator, and chips from `events` + `data.events`;
 *  - condition count populated from `checks` / `data.checks`;
 *  - admin sees the "Link existing automation" button + per-row
 *    unlink control;
 *  - non-admin sees neither (read-only mode);
 *  - 501 + 503 + generic-error degradation paths.
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
		operationId: 7,
		operationName: 'Auto-tag new uploads',
		operationClass: 'OCA\\WorkflowEngine\\Operation\\GenericOperation',
		entityType: 'OCA\\WorkflowEngine\\Entity\\File',
		operation: 'tag',
		enabled: true,
		url: '/index.php/settings/admin/workflow#7',
		linkId: 1,
		events: ['OCA\\WorkflowEngine\\Entity\\File::postCreate'],
		checks: [
			{ class: 'OCA\\WorkflowEngine\\Check\\FileMimeType', operator: 'matches', value: 'image/.*' },
		],
		...overrides,
	}
}

function envelope(results = [], isAdmin = false) {
	return { results, total: results.length, isAdmin }
}

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnFlowTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Workflow settings" CTA when no operations', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce(envelope([], false)))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No automations linked yet')
		expect(wrapper.text()).toContain('Open Workflow settings')
		wrapper.destroy()
	})

	it('renders a row with title, entity and operation summary', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce(envelope([makeOp()], false)))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-flow-tab__row')
		expect(rows).toHaveLength(1)
		expect(wrapper.text()).toContain('Auto-tag new uploads')
		expect(wrapper.text()).toContain('Entity:')
		expect(wrapper.text()).toContain('File')
		expect(wrapper.text()).toContain('Operation:')
		expect(wrapper.text()).toContain('tag')
		expect(wrapper.find('.cn-flow-tab__enabled--on').exists()).toBe(true)
		expect(wrapper.text()).toContain('Enabled')
		wrapper.destroy()
	})

	it('renders trigger-event chips shortened to the method name', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce(envelope([makeOp()], false)))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chips = wrapper.findAll('.cn-flow-tab__chip')
		expect(chips.length).toBeGreaterThan(0)
		expect(chips.at(0).text()).toBe('postCreate')
		wrapper.destroy()
	})

	it('renders a condition count when checks are present', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce(envelope([makeOp()], false)))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('1 conditions')
		wrapper.destroy()
	})

	it('marks operations with explicit enabled:false as disabled', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce(envelope([makeOp({ enabled: false })], false)))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-flow-tab__row--disabled').exists()).toBe(true)
		expect(wrapper.find('.cn-flow-tab__enabled--off').exists()).toBe(true)
		expect(wrapper.text()).toContain('Disabled')
		wrapper.destroy()
	})

	it('admin sees the "Link existing automation" button + per-row unlink', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce(envelope([makeOp()], true)))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.isAdmin).toBe(true)
		expect(wrapper.find('[data-testid="cn-flow-tab-link"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-flow-tab-unlink"]').exists()).toBe(true)
		wrapper.destroy()
	})

	it('non-admin sees neither link button nor per-row unlink', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce(envelope([makeOp()], false)))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.isAdmin).toBe(false)
		expect(wrapper.find('[data-testid="cn-flow-tab-link"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-flow-tab-unlink"]').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the 501 banner when Flow is not installed', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({}, 501))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Workflow Engine is not installed.')
		wrapper.destroy()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({}, 503))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Flow is currently unavailable.')
		expect(wrapper.find('.cn-flow-tab__row').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load automations.')
		wrapper.destroy()
		spy.mockRestore()
	})

	it('falls back to the shortened class name when name is absent', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce(envelope([makeOp({ operationName: '' })], false)))
		const wrapper = mount(CnFlowTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('GenericOperation')
		wrapper.destroy()
	})
})

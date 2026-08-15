import { mount } from '@vue/test-utils'
import CnFederationStatus from '@/components/CnFederationStatus/CnFederationStatus.vue'

const nodes = [
	{ id: 'a', name: 'Node A', url: 'https://a', status: 'up' },
	{ id: 'b', name: 'Node B', url: 'https://b', status: 'degraded', message: 'High latency' },
	{ id: 'c', name: 'Node C', url: 'https://c', status: 'down', lastChecked: '2026-01-01T00:00:00Z' },
	{ id: 'd', name: 'Node D', url: 'https://d', status: 'maintenance' },
]

describe('CnFederationStatus', () => {
	it('renders the empty state when nodes[] is empty', () => {
		const wrapper = mount(CnFederationStatus, { propsData: { nodes: [] } })
		expect(wrapper.find('.cn-federation-status__empty').exists()).toBe(true)
	})

	it('renders one row per node', () => {
		const wrapper = mount(CnFederationStatus, { propsData: { nodes } })
		expect(wrapper.findAll('.cn-federation-status__node').length).toBe(4)
	})

	it('computes status counts correctly', () => {
		const wrapper = mount(CnFederationStatus, { propsData: { nodes } })
		expect(wrapper.vm.counts).toEqual({ up: 1, degraded: 1, down: 1, unknown: 1 })
	})

	it('normalises status strings to the closed set', () => {
		const wrapper = mount(CnFederationStatus, { propsData: { nodes: [] } })
		expect(wrapper.vm.normaliseStatus('up')).toBe('up')
		expect(wrapper.vm.normaliseStatus('online')).toBe('up')
		expect(wrapper.vm.normaliseStatus('OK')).toBe('up')
		expect(wrapper.vm.normaliseStatus('degraded')).toBe('degraded')
		expect(wrapper.vm.normaliseStatus('partial')).toBe('degraded')
		expect(wrapper.vm.normaliseStatus('down')).toBe('down')
		expect(wrapper.vm.normaliseStatus('offline')).toBe('down')
		expect(wrapper.vm.normaliseStatus('error')).toBe('down')
		expect(wrapper.vm.normaliseStatus('maintenance')).toBe('unknown')
		expect(wrapper.vm.normaliseStatus('')).toBe('unknown')
		expect(wrapper.vm.normaliseStatus(undefined)).toBe('unknown')
	})

	it('sorts by status by default (down → degraded → unknown → up)', () => {
		const wrapper = mount(CnFederationStatus, { propsData: { nodes } })
		const order = wrapper.vm.sortedNodes.map((n) => n.id)
		expect(order).toEqual(['c', 'b', 'd', 'a'])
	})

	it('sorts by name when sort=name', () => {
		const wrapper = mount(CnFederationStatus, {
			propsData: {
				nodes: [
					{ id: '1', name: 'Charlie', status: 'up' },
					{ id: '2', name: 'Alpha', status: 'up' },
					{ id: '3', name: 'Bravo', status: 'up' },
				],
				sort: 'name',
			},
		})
		const order = wrapper.vm.sortedNodes.map((n) => n.name)
		expect(order).toEqual(['Alpha', 'Bravo', 'Charlie'])
	})

	it('preserves input order when sort=none', () => {
		const wrapper = mount(CnFederationStatus, { propsData: { nodes, sort: 'none' } })
		const order = wrapper.vm.sortedNodes.map((n) => n.id)
		expect(order).toEqual(['a', 'b', 'c', 'd'])
	})

	it('hides the summary when hideSummary is true', () => {
		const wrapper = mount(CnFederationStatus, { propsData: { nodes, hideSummary: true } })
		expect(wrapper.find('.cn-federation-status__summary').exists()).toBe(false)
	})

	it('hides the unknown chip when zero', () => {
		const wrapper = mount(CnFederationStatus, {
			propsData: {
				nodes: [{ id: 'a', name: 'A', status: 'up' }],
			},
		})
		expect(wrapper.text()).not.toContain('unknown')
	})

	it('emits @node-click on row click', async () => {
		const wrapper = mount(CnFederationStatus, { propsData: { nodes } })
		await wrapper.findAll('.cn-federation-status__node').at(0).trigger('click')
		expect(wrapper.emitted('node-click')).toBeTruthy()
		expect(wrapper.emitted('node-click')[0][0]).toMatchObject({ name: 'Node C' })
	})

	it('renders the title + description when provided', () => {
		const wrapper = mount(CnFederationStatus, {
			propsData: { nodes, title: 'Directory', description: 'Live status' },
		})
		expect(wrapper.text()).toContain('Directory')
		expect(wrapper.text()).toContain('Live status')
	})

	it('formats a valid ISO timestamp', () => {
		const wrapper = mount(CnFederationStatus, { propsData: { nodes: [] } })
		const formatted = wrapper.vm.formatTimestamp('2026-01-01T00:00:00Z')
		expect(formatted).not.toBe('2026-01-01T00:00:00Z') // localised
		expect(formatted.length).toBeGreaterThan(0)
	})

	it('falls back to the raw string when timestamp is malformed', () => {
		const wrapper = mount(CnFederationStatus, { propsData: { nodes: [] } })
		expect(wrapper.vm.formatTimestamp('not-a-date')).toBe('not-a-date')
	})
})

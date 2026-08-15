import { mount } from '@vue/test-utils'
import CnRelationshipGraph from '@/components/CnRelationshipGraph/CnRelationshipGraph.vue'

const nodes = [
	{ id: 'core', label: 'Core', isRoot: true },
	{ id: 'a', label: 'A' },
	{ id: 'b', label: 'B' },
	{ id: 'c', label: 'C' },
]
const edges = [
	{ source: 'core', target: 'a', label: 'sub' },
	{ source: 'core', target: 'b' },
	{ source: 'core', target: 'c' },
]

describe('CnRelationshipGraph', () => {
	it('renders one circle per node + lines per edge', () => {
		const wrapper = mount(CnRelationshipGraph, { propsData: { nodes, edges } })
		expect(wrapper.findAll('circle').length).toBe(nodes.length)
		expect(wrapper.findAll('line').length).toBe(edges.length)
	})

	it('places root node at the centre in radial layout', () => {
		const wrapper = mount(CnRelationshipGraph, { propsData: { nodes, edges, size: 400 } })
		const root = wrapper.vm.resolvedNodes.find((n) => n.isRoot)
		expect(root.x).toBe(200)
		expect(root.y).toBe(200)
	})

	it('places non-root nodes on the perimeter in radial layout', () => {
		const wrapper = mount(CnRelationshipGraph, { propsData: { nodes, edges, size: 400 } })
		const others = wrapper.vm.resolvedNodes.filter((n) => !n.isRoot)
		// All on a circle of radius (size/2 - nodeRadius - 24)
		const cx = 200; const cy = 200
		for (const o of others) {
			const dist = Math.sqrt((o.x - cx) ** 2 + (o.y - cy) ** 2)
			expect(Math.round(dist)).toBe(400 / 2 - 18 - 24)
		}
	})

	it('grid layout places nodes uniformly', () => {
		const wrapper = mount(CnRelationshipGraph, { propsData: { nodes, edges, layout: 'grid', size: 400 } })
		const out = wrapper.vm.resolvedNodes
		// 4 nodes → 2×2 grid; cell = 400 / 3 ≈ 133.33
		const cell = 400 / 3
		expect(out[0].x).toBeCloseTo(cell, 1)
		expect(out[0].y).toBeCloseTo(cell, 1)
	})

	it('manual layout uses node.x / node.y', () => {
		const manualNodes = [
			{ id: 'a', x: 50, y: 50 },
			{ id: 'b', x: 200, y: 200 },
			{ id: 'c' }, // no coords → defaults to centre
		]
		const wrapper = mount(CnRelationshipGraph, {
			propsData: { nodes: manualNodes, edges: [], layout: 'manual', size: 400 },
		})
		expect(wrapper.vm.resolvedNodes[0]).toMatchObject({ x: 50, y: 50 })
		expect(wrapper.vm.resolvedNodes[2]).toMatchObject({ x: 200, y: 200 })
	})

	it('drops edges referencing unknown ids', () => {
		const wrapper = mount(CnRelationshipGraph, {
			propsData: { nodes, edges: [...edges, { source: 'a', target: 'missing' }] },
		})
		expect(wrapper.vm.resolvedEdges.length).toBe(edges.length)
	})

	it('renders edge labels when set', () => {
		const wrapper = mount(CnRelationshipGraph, { propsData: { nodes, edges } })
		const labels = wrapper.findAll('.cn-relationship-graph__edge-label')
		expect(labels.length).toBe(1)
		expect(labels.at(0).text()).toBe('sub')
	})

	it('emits node-click with the original entry', async () => {
		const wrapper = mount(CnRelationshipGraph, { propsData: { nodes, edges } })
		const node = wrapper.findAll('.cn-relationship-graph__node').at(1)
		await node.trigger('click')
		expect(wrapper.emitted('node-click')).toBeTruthy()
		expect(wrapper.emitted('node-click')[0][0]).toMatchObject({ id: 'a' })
	})

	it('renders the legend when provided', () => {
		const wrapper = mount(CnRelationshipGraph, {
			propsData: {
				nodes,
				edges: [],
				legend: [{ label: 'Subfield', colour: '#21468b' }, { label: 'Related', colour: '#0082c9' }],
			},
		})
		expect(wrapper.findAll('.cn-relationship-graph__legend-entry').length).toBe(2)
	})

	it('falls back to the first node when no isRoot is set', () => {
		const wrapper = mount(CnRelationshipGraph, {
			propsData: { nodes: [{ id: 'a' }, { id: 'b' }], edges: [] },
		})
		expect(wrapper.vm.rootNode.id).toBe('a')
	})

	it('renders the title + description', () => {
		const wrapper = mount(CnRelationshipGraph, {
			propsData: { nodes, edges, title: 'Graph', description: 'Some links' },
		})
		expect(wrapper.text()).toContain('Graph')
		expect(wrapper.text()).toContain('Some links')
	})

	it('uses node.colour when set, else nodeColor / rootColor', () => {
		const wrapper = mount(CnRelationshipGraph, {
			propsData: {
				nodes: [
					{ id: 'a', isRoot: true, colour: '#abcdef' },
					{ id: 'b', colour: '#fedcba' },
					{ id: 'c' },
				],
				edges: [],
				nodeColor: '#default',
				rootColor: '#root',
			},
		})
		const circles = wrapper.findAll('circle')
		expect(circles.at(0).attributes('fill')).toBe('#abcdef')
		expect(circles.at(1).attributes('fill')).toBe('#fedcba')
		expect(circles.at(2).attributes('fill')).toBe('#default')
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * WHERE A LINE MAY ENTER AND LEAVE A STEP.
 *
 * A port is a claim about what the engine will accept. A trigger drawn with an
 * entry says a line may arrive there; nothing ever will, because a run STARTS
 * at a trigger. An end step drawn with an exit says the same in reverse. Both
 * were being drawn on every node regardless of role, so the canvas advertised a
 * graph shape the engine would refuse — and refused it at RUN time, naming a
 * node rather than the port that lied.
 *
 * ⚠️ THIS IS ASSERTED ON THE HANDLE SET, NOT ON A SCREENSHOT. jsdom computes no
 * layout, so which SIDE a port renders on is only observable here as the
 * `position` Vue Flow is handed. The e2e (`flow-canvas.e2e.js`) checks that
 * those positions become real boxes on the sides claimed.
 */
import { mount } from '@vue/test-utils'

import CnFlowNode from '../../src/components/CnGraphCanvas/CnFlowNode.vue'
import CnGraphCanvas from '../../src/components/CnGraphCanvas/CnGraphCanvas.vue'

/**
 * Mount one node with Vue Flow's Handle stubbed so its bindings are readable.
 *
 * @param {object} data The node's data bag.
 * @return {object} The wrapper.
 */
function mountNode(data = {}) {
	return mount(CnFlowNode, {
		props: { id: 'a', data: { label: 'Draft', ...data } },
		global: {
			stubs: {
				Handle: {
					name: 'Handle',
					props: ['id', 'type', 'position'],
					template: '<div class="handle-stub" :data-kind="type" :data-side="position" :data-handleid="id" v-bind="$attrs" />',
				},
			},
		},
	})
}

/**
 * @param {object} wrapper The mounted node.
 * @param {string} kind    `target` or `source`.
 * @return {Array<string>} The sides those handles sit on.
 */
function sides(wrapper, kind) {
	return wrapper.findAll(`[data-kind="${kind}"]`).map((handle) => handle.attributes('data-side'))
}

describe('a step’s ports', () => {
	describe('which ports exist at all', () => {
		it('gives an ordinary step both an entry and an exit', () => {
			const wrapper = mountNode()

			expect(sides(wrapper, 'target').length).toBeGreaterThan(0)
			expect(sides(wrapper, 'source').length).toBeGreaterThan(0)
		})

		it('gives a trigger NO entry — a run starts there', () => {
			const wrapper = mountNode({ hasTarget: false })

			expect(sides(wrapper, 'target')).toEqual([])
			expect(sides(wrapper, 'source').length).toBeGreaterThan(0)
		})

		it('gives an end step NO exit — the flow stops there', () => {
			const wrapper = mountNode({ hasSource: false })

			expect(sides(wrapper, 'source')).toEqual([])
			expect(sides(wrapper, 'target').length).toBeGreaterThan(0)
		})
	})

	describe('which side each port sits on', () => {
		/**
		 * LEFT AND RIGHT ARE PRIMARY because `useFlowStore.autoSort()` lays a
		 * flow out left to right, one column per depth — and Vue Flow binds an
		 * edge that names no handle to the FIRST handle of its type, so this
		 * order decides the default shape of every line on the canvas.
		 */
		it('offers entries on the left and the top, left first', () => {
			expect(sides(mountNode(), 'target')).toEqual(['left', 'top'])
		})

		it('offers a single exit on the right and the bottom, right first', () => {
			expect(sides(mountNode(), 'source')).toEqual(['right', 'bottom'])
		})

		it('puts a routing step’s first branch on the right and the rest along the bottom', () => {
			const wrapper = mountNode({ ports: [{ id: 'yes' }, { id: 'no' }, { id: 'else' }] })

			expect(sides(wrapper, 'source')).toEqual(['right', 'bottom', 'bottom'])
		})

		it('gives every branch its own handle, so none is unreachable', () => {
			const wrapper = mountNode({ ports: [{ id: 'yes' }, { id: 'no' }, { id: 'else' }] })
			const ids = wrapper.findAll('[data-kind="source"]').map((h) => h.attributes('data-handleid'))

			expect(new Set(ids).size).toBe(3)
		})
	})

	describe('a handle id is not a port id', () => {
		/**
		 * ⚠️ THE ENCODED ID MUST NEVER LEAVE THE CANVAS.
		 *
		 * One exit is drawn on two sides, and Vue Flow keys handles by id, so
		 * the two cannot share one — the side is encoded in
		 * (`yes__right`). A branch recorded under that name is a branch the
		 * engine has never heard of: it would take the default exit at run time
		 * while the canvas kept showing the branch the author drew.
		 */
		it('strips the side off a pointer connection before the host sees it', () => {
			const canvas = mount(CnGraphCanvas, { props: { nodes: [], edges: [] } })

			canvas.vm.onConnect({ source: 'a', target: 'b', sourceHandle: 'yes__bottom', targetHandle: 'in__left' })

			expect(canvas.emitted('connect')[0][0]).toEqual({
				source: 'a',
				target: 'b',
				sourceHandle: 'yes',
				// A node has exactly ONE inbound port, so an entry handle
				// reduces to null rather than to the literal `in`.
				targetHandle: null,
			})
		})

		it('leaves a port id that carries no side untouched', () => {
			const canvas = mount(CnGraphCanvas, { props: { nodes: [], edges: [] } })

			canvas.vm.onConnect({ source: 'a', target: 'b', sourceHandle: 'out', targetHandle: null })

			expect(canvas.emitted('connect')[0][0].sourceHandle).toBe('out')
		})

		it('keeps a port id that itself contains the separator', () => {
			const canvas = mount(CnGraphCanvas, { props: { nodes: [], edges: [] } })

			// Read with `lastIndexOf`, so the SIDE is the part that comes off
			// even when the port id is `weird__port`. A `split()` or a
			// `indexOf()` here would hand the host `weird` — a branch the engine
			// has never heard of, recorded silently.
			canvas.vm.onConnect({ source: 'a', target: 'b', sourceHandle: 'weird__port__right' })

			expect(canvas.emitted('connect')[0][0].sourceHandle).toBe('weird__port')
		})
	})

	describe('a port nothing is connected to', () => {
		it('warns on an entry no line arrives at', () => {
			const wrapper = mountNode({ hasIncoming: false, hasOutgoing: true })
			const entry = wrapper.find('[data-kind="target"]')

			expect(entry.classes()).toContain('cn-flow-node__handle--orphan')
			// NOT COLOUR ALONE: the consequence is in the title and in the
			// accessible name, so it reaches a reader who cannot see the ring.
			expect(entry.attributes('title')).toContain('never reach it')
			expect(entry.attributes('aria-label')).toContain('never reach it')
		})

		it('warns on an exit no line leaves from', () => {
			const wrapper = mountNode({ hasIncoming: true, hasOutgoing: false })
			const exit = wrapper.find('[data-kind="source"]')

			expect(exit.classes()).toContain('cn-flow-node__handle--orphan')
			expect(exit.attributes('title')).toContain('stops here')
		})

		/**
		 * ⚠️ UNDEFINED MEANS "NOT MEASURED", NOT "NOTHING CONNECTED".
		 *
		 * A host that does not compute connectedness — every plain CnGraphCanvas
		 * consumer — would otherwise get a warning on every port of a graph
		 * nobody claimed anything about.
		 */
		it('says nothing when the host did not measure connectedness', () => {
			const wrapper = mountNode()

			expect(wrapper.find('.cn-flow-node__handle--orphan').exists()).toBe(false)
		})

		it('does not warn about a port it does not draw', () => {
			// A trigger has no entry, so "nothing connects to this entry" is not
			// a finding about it — there is nothing to connect to.
			const wrapper = mountNode({ hasTarget: false, hasIncoming: false, hasOutgoing: true })

			expect(wrapper.find('.cn-flow-node__handle--orphan').exists()).toBe(false)
		})
	})
})

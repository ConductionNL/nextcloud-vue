/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A CONNECTION'S LABEL, WITHOUT A MOUSE — AND WITHOUT THE CANVAS OWNING IT.
 *
 * Two things are asserted here that the canvas cannot assert for itself.
 *
 * First, the keyboard. Sliding a label along its line was a pointer drag and
 * nothing else, which is a WCAG 2.1 AA 2.1.1 failure; the arrow keys are the
 * alternative, and they live in this component so that no consumer can ship a
 * canvas that quietly lacks them.
 *
 * Second, the direction of the write. The canvas REPORTS and never applies —
 * so a moved label must leave as an event with the host's `labelT` untouched.
 * A component that helpfully wrote the fraction back into its own prop would
 * look identical on screen and silently diverge from what gets saved.
 *
 * ⚠️ MOUNTED DIRECTLY, NOT THROUGH THE CANVAS. Vue Flow measures rendered
 * geometry and jsdom has no layout, so a canvas mounted here renders zero
 * nodes and therefore zero edges — a test driving it would pass over an empty
 * document. Vue Flow's two portals are stubbed for the same reason:
 * `EdgeLabelRenderer` teleports into a layer the canvas creates at runtime.
 */
import { mount } from '@vue/test-utils'
import CnFlowEdge from '../../src/components/CnGraphCanvas/CnFlowEdge.vue'

const stubs = {
	BaseEdge: { template: '<path class="stub-edge" />' },
	EdgeLabelRenderer: { template: '<div><slot /></div>' },
}

/**
 * Mount one edge.
 *
 * @param {object} props Overrides for the edge's props.
 * @param {object} slots Slots to render.
 * @return {object} The wrapper.
 */
function mountEdge(props = {}, slots = { label: '<span>ship it</span>' }) {
	return mount(CnFlowEdge, {
		props: {
			id: 'e1',
			sourceX: 0,
			sourceY: 0,
			targetX: 100,
			targetY: 0,
			...props,
		},
		slots,
		global: { stubs },
	})
}

describe('CnFlowEdge', () => {
	it('renders no label control when the host renders no label', () => {
		const wrapper = mountEdge({}, {})

		// An edge with nothing to say draws nothing. An empty chip reads as a
		// missing VALUE — "this connection has a blank name" — rather than as
		// an absent one, which is the misreading that put "No step type" on
		// sixteen lines of a migrated flow.
		expect(wrapper.find('.cn-flow-edge__label').exists()).toBe(false)
	})

	/**
	 * The case that actually occurs. A host fills the slot ONCE, for every
	 * edge, and most edges have no title — so gating on the slot's presence
	 * rather than on what it renders puts an empty chip on every unnamed line.
	 * That reads as "this connection's name is blank" instead of "it has
	 * none", which is how a migrated flow came to print "No step type" sixteen
	 * times.
	 */
	it('draws no chip when the host renders nothing for this edge', () => {
		const wrapper = mountEdge(
			{ data: { label: '' } },
			{ label: '<span v-if="false">never</span>' },
		)

		expect(wrapper.find('.cn-flow-edge__label').exists()).toBe(false)
	})

	it('draws the chip when the host does render something', () => {
		const wrapper = mountEdge(
			{ data: { label: 'ship it' } },
			{ label: '<span v-if="true">ship it</span>' },
		)

		expect(wrapper.find('.cn-flow-edge__label').text()).toBe('ship it')
	})

	it('gives the label a real focusable control, not a focusable <g>', () => {
		const label = mountEdge().find('.cn-flow-edge__label')

		// The SVG `<g role="button" tabindex="0">` this replaces is treated
		// inconsistently by assistive technology. EdgeLabelRenderer puts the
		// label in the DOM layer, so it can be an actual button.
		expect(label.element.tagName).toBe('BUTTON')
		expect(label.attributes('type')).toBe('button')
	})

	it('slides the label along its line with the arrow keys', async () => {
		const wrapper = mountEdge({ data: { labelT: 0.5 } })

		await wrapper.find('.cn-flow-edge__label').trigger('keydown', { key: 'ArrowRight' })

		expect(wrapper.emitted('label-move')[0][0]).toEqual({ id: 'e1', labelT: 0.55 })

		await wrapper.find('.cn-flow-edge__label').trigger('keydown', { key: 'ArrowLeft' })

		expect(wrapper.emitted('label-move')[1][0]).toEqual({ id: 'e1', labelT: 0.45 })
	})

	it('reports the move and never applies it', async () => {
		const wrapper = mountEdge({ data: { labelT: 0.5 } })

		await wrapper.find('.cn-flow-edge__label').trigger('keydown', { key: 'ArrowRight' })

		// The host owns the document. If this component wrote the new fraction
		// into its own data the label would move on screen while the value the
		// host saves stayed at 0.5 — the same class of divergence as an edge
		// that draws but is never persisted.
		expect(wrapper.props('data').labelT).toBe(0.5)
	})

	it('keeps the label off both ends of the line', async () => {
		const wrapper = mountEdge({ data: { labelT: 0.99 } })

		await wrapper.find('.cn-flow-edge__label').trigger('keydown', { key: 'ArrowRight' })

		// A label sitting on a node is unreadable, unclickable, and covers the
		// port underneath it.
		const { labelT } = wrapper.emitted('label-move')[0][0]

		expect(labelT).toBeLessThan(1)
		expect(labelT).toBeGreaterThan(0)
	})

	it('ignores keys that are not a move', async () => {
		const wrapper = mountEdge()

		await wrapper.find('.cn-flow-edge__label').trigger('keydown', { key: 'a' })

		expect(wrapper.emitted('label-move')).toBeUndefined()
	})

	it('lets the router change the line without changing the component', () => {
		// The router is ONE value in ONE place: this prop. The canvas maps it
		// out of `data.lineType`, and the store spec asserts it travels there
		// rather than in `type` — a component and a router are different
		// things, and while the router sat in `type` Vue Flow answered with
		// its own built-in edge, so no label could be attached to any line.
		//
		// Read off `path` rather than a class or an attribute because the
		// router's whole observable effect IS the geometry.
		const straight = mountEdge({ lineType: 'straight' })
		const stepped = mountEdge({ lineType: 'smoothstep' })

		expect(straight.vm.path).not.toBe(stepped.vm.path)
	})

	/**
	 * The replay's payload control — "open the JSON that passed along this
	 * connection" — has to be activatable in its own right, and the label
	 * wrapper is a button. A button cannot contain another button, so the two
	 * are siblings rather than nested.
	 */
	it('puts host controls beside the label, not inside its button', () => {
		const wrapper = mountEdge({}, {
			label: '<span>ship it</span>',
			adornment: '<button class="payload">{}</button>',
		})

		const payload = wrapper.find('.payload')

		expect(payload.exists()).toBe(true)
		expect(payload.element.closest('.cn-flow-edge__label')).toBeNull()
	})

	it('draws no adornment for an edge the host gives none', () => {
		const wrapper = mountEdge({}, {
			label: '<span>ship it</span>',
			adornment: '<button v-if="false" class="payload">{}</button>',
		})

		// A replay marks a handful of connections out of many; the rest must
		// not carry an empty affordance beside their label.
		expect(wrapper.find('.cn-flow-edge__adornment').exists()).toBe(false)
	})

	it('opens the same menu from the label as from the line', async () => {
		const wrapper = mountEdge()

		await wrapper.find('.cn-flow-edge__label').trigger('contextmenu')

		expect(wrapper.emitted('label-context')[0][0].id).toBe('e1')
	})
})

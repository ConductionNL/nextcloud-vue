/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A flow is started by a step on the canvas, and by nothing else.
 *
 * WHY THE SETTINGS MODAL LOSES ITS TRIGGER FIELDS
 * -----------------------------------------------
 * What starts a flow is a NODE — `openregister.trigger-object`,
 * `…trigger-schedule`, `…trigger-manual`. The four legacy columns on the flow
 * row (`trigger`, `triggerRegister`, `triggerSchema`, `cron`) hold exactly ONE
 * trigger between them, which is why "on a schedule AND when an object
 * changes" had no representation and was worked around by duplicating the
 * flow. The engine already dispatches from the index derived off the nodes.
 *
 * So the modal's trigger controls were a second, weaker way to say a fact the
 * graph already carries, in a place the author was not looking. Two writers for
 * one fact is the shape that drifts, and one of them goes.
 *
 * WHY RUN IS DISABLED WITHOUT A MANUAL START STEP
 * -----------------------------------------------
 * Running by hand is an entry point like any other, and a flow whose only way
 * in is an object event or a schedule does not have one. Pressing Run on such a
 * flow asked the engine to start something the graph does not describe, and the
 * engine refused several seconds later in words about nodes rather than about
 * the button that was pressed. A control that cannot work should say so where
 * the hand is, before the click.
 */

import { mount } from '@vue/test-utils'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'
import CnFlowSettingsModal from '../../src/dialogs/CnFlowSettingsModal.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const MANUAL = { id: 'start', type: 'openregister.trigger-manual', config: {} }
const STEP = { id: 'ask', type: 'openregister.user-task', config: {} }

/**
 * Mount the settings modal over the store THE COMPONENT holds.
 *
 * 🔴 SEED `wrapper.vm.store`, NEVER A STORE OF OUR OWN. `tests/setup.js`
 * installs a global pinia, so a `useFlowStore()` called out here resolves to a
 * different instance: seeding that one leaves the component rendering an empty
 * flow, and every assertion sees "".
 *
 * @param {object} flow The flow to seed.
 * @return {Promise<object>} The wrapper.
 */
async function mountSettings(flow = {}) {
	const wrapper = mount(CnFlowSettingsModal, {
		global: {
			stubs: {
				NcDialog: { template: '<div class="dialog"><slot /></div>' },
				NcTextField: {
					props: ['label', 'modelValue'],
					template: '<label class="text-field">{{ label }}</label>',
				},
				NcSelect: {
					props: ['inputLabel'],
					template: '<label class="select">{{ inputLabel }}</label>',
				},
			},
			mocks: { t: (app, s) => s },
		},
	})

	Object.assign(wrapper.vm.store, { flow: { id: 'f-1', name: 'A flow', trigger: 'manual', ...flow } })
	await wrapper.vm.$nextTick()

	return wrapper
}

/**
 * Mount the editor over the store the component holds, seeded with these nodes.
 *
 * @param {Array<object>} nodes The graph's nodes.
 * @param {object} flow Flow overrides.
 * @return {Promise<object>} The wrapper.
 */
async function mountEditor(nodes, flow = {}) {
	const wrapper = mount(CnFlowDetail, {
		global: {
			stubs: {
				NcButton: {
					props: ['disabled', 'title'],
					template: '<button :disabled="disabled" :title="title"><slot /></button>',
				},
			},
			mocks: { t: (app, s) => s },
		},
		shallow: true,
	})

	// `mounted()` awaits `store.load()`, which would replace the flow with
	// whatever the mocked request returned. Stubbing it is not tuning a timer:
	// a test about the graph the editor holds must not also be loading one.
	wrapper.vm.store.load = jest.fn().mockResolvedValue(undefined)

	// ⚠️ `store.nodes` is a GETTER over `state.flow.nodes`, so assigning it is
	// silently ignored. The graph is seeded INSIDE the flow or it is not
	// seeded at all — and an empty derived list still reads as "no manual
	// start step", so the wrong seeding passes four of these five tests.
	Object.assign(wrapper.vm.store, { flow: { id: 'f-1', name: 'A flow', nodes, edges: [], ...flow } })
	await wrapper.vm.$nextTick()

	return wrapper
}

describe('the trigger is a node, not a field', () => {
	it('the settings modal offers no trigger control at all', async () => {
		const wrapper = await mountSettings()
		const text = wrapper.text()

		expect(text).not.toContain('Trigger')
		expect(text).not.toContain('Restrict to register')
		expect(text).not.toContain('Restrict to schema')
		expect(text).not.toContain('Cron schedule')
		expect(wrapper.find('.select').exists()).toBe(false)
	})

	it('the modal still edits the flow’s own fields', async () => {
		const wrapper = await mountSettings()
		const labels = wrapper.findAll('.text-field').map((n) => n.text())

		expect(labels).toContain('Name')
		expect(labels).toContain('Description')
	})

	it('and says where the trigger lives instead, rather than dropping it silently', async () => {
		const wrapper = await mountSettings()
		const note = wrapper.find('[data-testid="flow-settings-trigger-note"]')

		expect(note.exists()).toBe(true)
		expect(note.text()).toContain('step on the canvas')
	})

	it('a schedule flow gets no cron box either — the schedule step owns it', async () => {
		const wrapper = await mountSettings({ trigger: 'schedule', cron: '0 9 * * 1' })

		expect(wrapper.text()).not.toContain('Cron schedule')
		expect(wrapper.text()).not.toContain('0 9 * * 1')
	})
})

describe('Run needs a manual start step', () => {
	/**
	 * @param {object} wrapper The mounted editor.
	 * @return {object} The Run button.
	 */
	const runButton = (wrapper) => wrapper.find('[data-testid="flow-run-button"]')

	it('is disabled when the graph has no manual start step', async () => {
		const wrapper = await mountEditor([STEP])
		const run = runButton(wrapper)

		expect(run.exists()).toBe(true)
		expect(run.attributes('disabled')).toBeDefined()
	})

	it('explains why, naming the step to add', async () => {
		const wrapper = await mountEditor([STEP])

		expect(runButton(wrapper).attributes('title')).toContain('manual start step')
	})

	it('is enabled once a manual start step is on the canvas', async () => {
		const wrapper = await mountEditor([MANUAL, STEP])
		const run = runButton(wrapper)

		expect(run.attributes('disabled')).toBeUndefined()
		expect(run.attributes('title')).toBeFalsy()
	})

	it('an unsaved flow is refused first, because that is the order the author meets them', async () => {
		const wrapper = await mountEditor([MANUAL], { id: null })

		expect(runButton(wrapper).attributes('title')).toContain('Save the flow')
	})

	it('a schedule-only flow cannot be run by hand', async () => {
		const wrapper = await mountEditor([
			{ id: 'cron', type: 'openregister.trigger-schedule', config: {} },
			STEP,
		])

		expect(runButton(wrapper).attributes('disabled')).toBeDefined()
	})
})

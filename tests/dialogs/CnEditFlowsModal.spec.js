/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnEditFlowsModal — derives the app's register slugs from the
 * manifest, loads the matching OpenRegister schemas, parses each schema's
 * `x-openregister-flows` into an editable form, and persists changes back via
 * PATCH /api/schemas/{id} with the merged configuration.
 */
import { mount } from '@vue/test-utils'

import axios from '@nextcloud/axios'
import CnEditFlowsModal from '../../src/dialogs/CnEditFlowsModal.vue'

jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))

const Stub = (name, props = []) => ({ name, props, template: '<div><slot /></div>' })

function mountModal(manifest) {
	return mount(CnEditFlowsModal, {
		propsData: { manifest },
		stubs: {
			NcModal: Stub('NcModal', ['name', 'size']),
			NcButton: Stub('NcButton', ['type', 'disabled']),
			NcTextField: Stub('NcTextField', ['value', 'label', 'type']),
			NcSelect: Stub('NcSelect', ['value', 'options']),
			NcLoadingIcon: Stub('NcLoadingIcon'),
			NcNoteCard: Stub('NcNoteCard', ['type']),
			NcEmptyContent: Stub('NcEmptyContent', ['name', 'description']),
			NcCheckboxRadioSwitch: Stub('NcCheckboxRadioSwitch', ['checked']),
		},
	})
}

const MANIFEST = {
	pages: [
		{ id: 'a', config: { register: 'app-reg' } },
		{ id: 'b', config: { register: 'app-reg' } },
		{ id: 'c', config: {} },
	],
}

const PET_FLOW = {
	name: 'new-pet-vet-inspection',
	trigger: 'created',
	actions: [
		{ type: 'calendar-event', summary: 'Inspect new pet: {{name}}', offsetDays: 1, durationMinutes: 30 },
		{ type: 'email', to: 'vet@petstore.example', subject: 'New pet: {{name}}', body: 'x' },
	],
}

/**
 * A flow using the two action types FlowActionService dispatches but which the
 * modal historically could not author — plus a type it has never heard of.
 * Opening the editor and saving used to rewrite all three to an empty email.
 */
const RICH_FLOW = {
	name: 'agent-and-share',
	trigger: 'updated',
	actions: [
		{
			type: 'agent',
			agent: 'summariser',
			skill: 'summarise',
			prompt: 'Summarise {{name}}',
			resultField: 'summary',
			mode: 'async',
			requiresApproval: true,
		},
		{ type: 'federate-share', sharedWith: 'peer@cloud.example', permissions: 'read' },
		{ type: 'some-future-action', customField: 'keep me' },
	],
}

/** Load a register with one schema carrying the agent/federate-share/unknown flow. */
function primeWithRichFlow() {
	axios.get
		.mockResolvedValueOnce({ data: { results: [{ id: 1, slug: 'app-reg', title: 'App', schemas: [10] }] } })
		.mockResolvedValueOnce({ data: { result: { id: 10, slug: 'pet', title: 'Pet', properties: { name: {} }, configuration: { 'x-openregister-flows': [RICH_FLOW] } } } })
}

/** Load a register with one schema that already carries the pet flow. */
function primeWithPetFlow() {
	axios.get
		.mockResolvedValueOnce({ data: { results: [{ id: 1, slug: 'app-reg', title: 'App', schemas: [10] }] } })
		.mockResolvedValueOnce({ data: { result: { id: 10, slug: 'pet', title: 'Pet', properties: { name: {}, species: {} }, configuration: { 'x-openregister-flows': [PET_FLOW] } } } })
}

beforeEach(() => {
	axios.get.mockReset(); axios.patch.mockReset()
})

describe('CnEditFlowsModal', () => {
	it('manifestRegisterSlugs is the distinct set of page register slugs', () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		const wrapper = mountModal(MANIFEST)
		expect(wrapper.vm.manifestRegisterSlugs).toEqual(['app-reg'])
	})

	it('loads the app schemas and parses the selected schema\'s flows into the form', async () => {
		primeWithPetFlow()
		const wrapper = mountModal(MANIFEST)
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.schemas.map((s) => s.id)).toEqual([10])
		expect(wrapper.vm.flows).toHaveLength(1)
		expect(wrapper.vm.flows[0].name).toBe('new-pet-vet-inspection')
		expect(wrapper.vm.flows[0].actions.map((a) => a.type)).toEqual(['calendar-event', 'email'])
	})

	it('editing the working flows does not mutate the loaded schema until save', async () => {
		primeWithPetFlow()
		const wrapper = mountModal(MANIFEST)
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		wrapper.vm.flows[0].name = 'changed'
		// The source schema config is untouched (deep clone on select).
		expect(wrapper.vm.selectedSchema.configuration['x-openregister-flows'][0].name).toBe('new-pet-vet-inspection')
	})

	it('addFlow / addAction / removeAction mutate the working flows', async () => {
		primeWithPetFlow()
		const wrapper = mountModal(MANIFEST)
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		wrapper.vm.addFlow()
		expect(wrapper.vm.flows).toHaveLength(2)
		const flow = wrapper.vm.flows[1]
		expect(flow.actions).toHaveLength(1)
		wrapper.vm.addAction(flow)
		expect(flow.actions).toHaveLength(2)
		wrapper.vm.removeAction(flow, 0)
		expect(flow.actions).toHaveLength(1)
	})

	// Regression: FlowActionService::runAction() dispatches calendar-event, email,
	// agent and federate-share. cleanFlows() authored only the first two and its
	// catch-all rewrote everything else to `{ type: 'email' }`, so merely opening
	// this modal and saving destroyed hand-authored agent / federate-share flows.
	describe('round-trips every action type the backend dispatches', () => {
		it('preserves an agent action verbatim through cleanFlows', async () => {
			primeWithRichFlow()
			const wrapper = mountModal(MANIFEST)
			await new Promise((resolve) => setTimeout(resolve, 0))
			await wrapper.vm.$nextTick()

			const [agentAction] = wrapper.vm.cleanFlows()[0].actions
			expect(agentAction).toEqual({
				type: 'agent',
				agent: 'summariser',
				skill: 'summarise',
				prompt: 'Summarise {{name}}',
				resultField: 'summary',
				mode: 'async',
				requiresApproval: true,
			})
		})

		it('preserves a federate-share action verbatim through cleanFlows', async () => {
			primeWithRichFlow()
			const wrapper = mountModal(MANIFEST)
			await new Promise((resolve) => setTimeout(resolve, 0))
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.cleanFlows()[0].actions[1]).toEqual({
				type: 'federate-share',
				sharedWith: 'peer@cloud.example',
				permissions: 'read',
			})
		})

		it('round-trips an unknown action type instead of rewriting it', async () => {
			primeWithRichFlow()
			const wrapper = mountModal(MANIFEST)
			await new Promise((resolve) => setTimeout(resolve, 0))
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.cleanFlows()[0].actions[2]).toEqual({
				type: 'some-future-action',
				customField: 'keep me',
			})
		})

		it('no action is silently collapsed to email on save', async () => {
			primeWithRichFlow()
			const wrapper = mountModal(MANIFEST)
			await new Promise((resolve) => setTimeout(resolve, 0))
			await wrapper.vm.$nextTick()

			const types = wrapper.vm.cleanFlows()[0].actions.map((a) => a.type)
			expect(types).toEqual(['agent', 'federate-share', 'some-future-action'])
		})

		it('omits an empty optional skill rather than sending an empty string', async () => {
			primeWithRichFlow()
			const wrapper = mountModal(MANIFEST)
			await new Promise((resolve) => setTimeout(resolve, 0))
			await wrapper.vm.$nextTick()

			wrapper.vm.flows[0].actions[0].skill = ''
			const cleaned = wrapper.vm.cleanFlows()[0].actions[0]
			// Assert the type first: without it this passes vacuously against the old
			// code, which returned an email object that has no `skill` either.
			expect(cleaned.type).toBe('agent')
			expect(cleaned).not.toHaveProperty('skill')
		})

		it('does not label an agent action as a calendar event in the type picker', async () => {
			primeWithRichFlow()
			const wrapper = mountModal(MANIFEST)
			await new Promise((resolve) => setTimeout(resolve, 0))
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.actionTypeOption('agent').id).toBe('agent')
			// An unknown type keeps its own identity rather than borrowing the first option's.
			expect(wrapper.vm.actionTypeOption('some-future-action').id).toBe('some-future-action')
			expect(wrapper.vm.isAuthorable('some-future-action')).toBe(false)
			expect(wrapper.vm.isAuthorable('agent')).toBe(true)
		})

		it('setActionType seeds the fields FlowActionService requires', () => {
			axios.get.mockResolvedValue({ data: { results: [] } })
			const wrapper = mountModal(MANIFEST)

			const action = { type: 'email' }
			wrapper.vm.setActionType(action, { id: 'agent' })
			// agent + resultField are hard requirements server-side; mode defaults to async.
			expect(action).toMatchObject({ type: 'agent', agent: '', resultField: '', mode: 'async', requiresApproval: false })

			const share = { type: 'email' }
			wrapper.vm.setActionType(share, { id: 'federate-share' })
			expect(share).toMatchObject({ type: 'federate-share', sharedWith: '', permissions: 'read' })
		})
	})

	it('normaliseType maps aliases to canonical action types', () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		const wrapper = mountModal(MANIFEST)
		expect(wrapper.vm.normaliseType('agenda-task')).toBe('calendar-event')
		expect(wrapper.vm.normaliseType('mail')).toBe('email')
		expect(wrapper.vm.isCalendar('agenda-task')).toBe(true)
		expect(wrapper.vm.isEmail('mail')).toBe(true)
	})

	it('save PATCHes the schema with cleaned flows (numbers coerced) inside configuration', async () => {
		primeWithPetFlow()
		const wrapper = mountModal(MANIFEST)
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		// Simulate a number field arriving as a string from NcTextField.
		wrapper.vm.flows[0].actions[0].offsetDays = '2'
		axios.patch.mockResolvedValue({ data: {} })
		await wrapper.vm.save()
		expect(axios.patch).toHaveBeenCalledTimes(1)
		const [url, body] = axios.patch.mock.calls[0]
		expect(url).toBe('/apps/openregister/api/schemas/10')
		const saved = body.configuration['x-openregister-flows'][0]
		expect(saved.name).toBe('new-pet-vet-inspection')
		expect(saved.actions[0].offsetDays).toBe(2) // coerced to number
		expect(saved.actions[1]).toEqual({ type: 'email', to: 'vet@petstore.example', subject: 'New pet: {{name}}', body: 'x' })
		expect(wrapper.emitted().saved).toBeTruthy()
		expect(wrapper.emitted().close).toBeTruthy()
	})
})

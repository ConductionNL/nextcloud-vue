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

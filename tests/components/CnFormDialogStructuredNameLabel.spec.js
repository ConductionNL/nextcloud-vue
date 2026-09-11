/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A seeded reference shows the referenced record's NAME, not `[object Object]`.
 *
 * Reported from dossiq: filing a case from a contact page opens the create
 * dialog with `requester` pre-seeded from the contact, and the field showed no
 * name. The diagnosis handed over was "the field is declared and validated but
 * never mounted". It is not: this file's first three tests exist to say so —
 * the field mounts, and the seeded value is in the form's model and would be
 * submitted.
 *
 * What was actually wrong is one candidate list. `requester` declares
 * `referenceSemanticType: ns#Requester`, which resolves to `brpPerson`, so the
 * dialog fetches the person to label the selection. A `brpPerson` carries Haal
 * Centraal naming — `name: { givenNames, namePrefix, surname }` — and
 * `displayLabel` took the first TRUTHY key from its own chain starting at
 * `title`, `name`. The label became that OBJECT.
 *
 * Measured on the running instance: the row's `@self.name` is "Stephan
 * Janssen", which is the display name OpenRegister derived for exactly this
 * purpose, and it sat four candidates further down a list that never reached
 * it. The fix routes the dialog through the shared `objectDisplayName`, which
 * asks `@self.name` first and type-checks.
 */

import { mount } from '@vue/test-utils'

const PERSON = {
	id: 'person-uuid-1',
	citizenServiceNumber: '999993653',
	// The real shape, from dossiq's own seeder.
	name: { givenNames: 'Test', surname: 'Zonder' },
	displayName: 'Test Zonder',
	'@self': { id: 'person-uuid-1', name: 'Test Zonder' },
}

const mockStore = {
	objectTypeRegistry: {},
	createObjectTypeSlug: (...parts) => parts.join('-'),
	registerObjectType: jest.fn((slug) => { mockStore.objectTypeRegistry[slug] = {} }),
	fetchCollection: jest.fn().mockResolvedValue([PERSON]),
	fetchObject: jest.fn().mockResolvedValue(PERSON),
}

jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

let mockAxiosGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockAxiosGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (path) => path }))

import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: { props: ['label', 'modelValue', 'disabled'], template: '<input class="nc-text-field" :disabled="disabled" :value="modelValue" />' },
	// Render the selected option's LABEL, which is what a browser paints and
	// what dossiq's e2e looks for. A `true` stub would swallow it and this
	// whole file could pass with the defect present.
	NcSelect: { props: ['modelValue', 'options', 'inputLabel'], template: '<div class="nc-select">{{ modelValue && modelValue.label }}</div>' },
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	CnJsonViewer: true,
}

const REQUESTER_URI = 'https://openregister.app/ns#Requester'

// dossiq's `case` schema, cut to the two properties this is about.
const caseSchema = {
	title: 'Case',
	properties: {
		title: { type: 'string', title: 'Title' },
		requester: {
			type: 'string',
			format: 'uuid',
			referenceSemanticType: REQUESTER_URI,
			title: 'Requester',
		},
	},
}

/** Mount the dialog exactly as dossiq's `new-case-for-contact` action does. */
function mountDialog() {
	return mount(CnFormDialog, {
		propsData: {
			schema: caseSchema,
			item: null,
			register: 'dossiq',
			// `props: { requester: "@objectId" }` on the action, already resolved.
			initialData: { requester: PERSON.id },
			includeFields: ['title', 'requester'],
			// The manifest's own override, verbatim.
			fieldOverrides: { requester: { widget: 'InitiatorPicker', label: 'Requester' } },
		},
		global: { stubs },
	})
}

describe('CnFormDialog — a seeded reference is labelled by name', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockAxiosGet = jest.fn().mockResolvedValue({
			data: { resolved: true, registerSlug: 'dossiq', schemaSlug: 'brpPerson', appId: 'dossiq' },
		})
	})

	// NOT THE REPORTED SHAPE, and these three say so. They are the reason this
	// file does not carry a fix for "declared and never mounted": there was
	// nothing to fix there.
	it('mounts the field — it is not declared-and-dropped', async () => {
		const wrapper = mountDialog()
		await flushPromises()
		await flushPromises()
		expect(wrapper.findAll('.cn-form-dialog__select-wrapper').length).toBe(1)
	})

	it('registers the seeded value with the form model, so the case is filed WITH a requester', async () => {
		const wrapper = mountDialog()
		await flushPromises()
		await flushPromises()
		expect(wrapper.vm.formData.requester).toBe(PERSON.id)
	})

	it('submits the seeded requester, so the case is not filed without one', async () => {
		const wrapper = mountDialog()
		await flushPromises()
		await flushPromises()

		// The claim this file makes against the reported diagnosis, held by an
		// assertion rather than stated. The payload is built from formData, so
		// a value seeded by the action reaches the save whether or not anything
		// was typed.
		wrapper.vm.executeConfirm()
		const [payload] = wrapper.emitted('confirm')[0]
		expect(payload.requester).toBe(PERSON.id)
	})

	it('does not leave the field disabled as an unresolved semantic reference', async () => {
		const wrapper = mountDialog()
		await flushPromises()
		await flushPromises()
		expect(wrapper.findAll('.cn-form-dialog__semantic-unresolved').length).toBe(0)
	})

	// THE DEFECT.
	it('labels the seeded person by name, not with a structured name object', async () => {
		const wrapper = mountDialog()
		await flushPromises()
		await flushPromises()

		expect(mockStore.fetchObject).toHaveBeenCalledWith('dossiq-brpPerson', PERSON.id)
		// Pre-fix this was the `{ givenNames, surname }` OBJECT.
		expect(wrapper.vm.referenceLabels[PERSON.id]).toBe('Test Zonder')
		expect(typeof wrapper.vm.referenceLabels[PERSON.id]).toBe('string')
	})

	it('paints the name where the user reads it', async () => {
		const wrapper = mountDialog()
		await flushPromises()
		await flushPromises()

		// The assertion dossiq's e2e makes on the real dialog: the contact's
		// name is on screen before anything is typed. Pre-fix the select
		// rendered `[object Object]`.
		expect(wrapper.text()).toContain('Test Zonder')
		expect(wrapper.text()).not.toContain('[object Object]')
	})

	it('selects the option as a string-labelled pair', async () => {
		const wrapper = mountDialog()
		await flushPromises()
		await flushPromises()

		const field = wrapper.vm.visibleFields.find((f) => f.key === 'requester')
		expect(wrapper.vm.getEffectiveSelectedOption(field)).toEqual({ id: PERSON.id, label: 'Test Zonder' })
	})
})

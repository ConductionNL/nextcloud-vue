/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Fields the chosen record already answers. A case type knows the status a
 * case of its kind starts in, who normally handles it and what it is called,
 * so a case handler should not retype any of it.
 *
 * The rule the whole feature rests on: only an EMPTY field is filled. What
 * someone has typed is theirs, and changing the case type afterwards does not
 * take it away.
 */

import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'
import { useObjectStore } from '@/store/useObjectStore.js'

jest.mock('@/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: jest.fn(),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button @click="$attrs.onClick && $attrs.onClick()"><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	CnResourceSelect: true,
	CnFieldHelper: true,
	CnJsonViewer: true,
}

const PREFILL = {
	fields: {
		title: 'title',
		status: 'initialStatus',
		assignee: 'defaultAssignee',
	},
}

const caseSchema = {
	title: 'Case',
	properties: {
		caseType: {
			type: 'string',
			title: 'Case type',
			$ref: 'caseType',
			order: 1,
			'x-openregister-prefill': PREFILL,
		},
		title: { type: 'string', title: 'Title', order: 2 },
		status: { type: 'string', title: 'Status', order: 3 },
		assignee: { type: 'string', title: 'Assignee', order: 4 },
	},
	required: ['caseType'],
}

const SUBSIDIE = {
	id: 'ct-subsidie',
	title: 'Subsidieaanvraag',
	initialStatus: 'st-ontvangen',
	defaultAssignee: 'jdoe',
}

const KLACHT = {
	id: 'ct-klacht',
	title: 'Klacht behandeling',
	initialStatus: 'st-nieuw',
	defaultAssignee: 'asmit',
}

/**
 * A store whose single-object fetch answers with a case type record.
 *
 * @param {object} [records] Case type records keyed by id.
 * @return {{fetchObject: Function}} The mock handle.
 */
function mockStore(records = { 'ct-subsidie': SUBSIDIE, 'ct-klacht': KLACHT }) {
	const fetchObject = jest.fn((type, id) => Promise.resolve(records[id] || null))
	useObjectStore.mockReturnValue({
		fetchCollection: jest.fn(() => Promise.resolve([])),
		createObjectTypeSlug: (register, schema) => `${register}/${schema}`,
		registerObjectType: jest.fn(),
		objectTypeRegistry: {},
		fetchObject,
	})
	return { fetchObject }
}

function mountForm(propsData = {}) {
	return mount(CnFormDialog, {
		propsData: { schema: caseSchema, item: null, register: 'dossiq', ...propsData },
		stubs,
	})
}

describe('CnFormDialog prefill from the chosen record', () => {
	beforeEach(() => useObjectStore.mockReset())

	it('fetches nothing until a driving value is picked', async () => {
		const { fetchObject } = mockStore()
		mountForm()
		await flush()

		expect(fetchObject).not.toHaveBeenCalled()
	})

	it('fills the empty fields the chosen case type answers', async () => {
		mockStore()
		const wrapper = mountForm()
		await flush()

		wrapper.vm.formData.caseType = 'ct-subsidie'
		await flush()

		expect(wrapper.vm.formData.title).toBe('Subsidieaanvraag')
		expect(wrapper.vm.formData.status).toBe('st-ontvangen')
		expect(wrapper.vm.formData.assignee).toBe('jdoe')
	})

	it('leaves a title the person already typed completely alone', async () => {
		mockStore()
		const wrapper = mountForm()
		await flush()

		wrapper.vm.formData.title = 'Aanvraag buurttuin Vogelwijk'
		wrapper.vm.formData.caseType = 'ct-subsidie'
		await flush()

		expect(wrapper.vm.formData.title).toBe('Aanvraag buurttuin Vogelwijk')
		// The fields they did NOT fill still get the type's answers.
		expect(wrapper.vm.formData.status).toBe('st-ontvangen')
	})

	it('keeps that title when the case type changes again', async () => {
		mockStore()
		const wrapper = mountForm()
		await flush()

		wrapper.vm.formData.title = 'Aanvraag buurttuin Vogelwijk'
		wrapper.vm.formData.caseType = 'ct-subsidie'
		await flush()
		wrapper.vm.formData.caseType = 'ct-klacht'
		await flush()

		expect(wrapper.vm.formData.title).toBe('Aanvraag buurttuin Vogelwijk')
		// A field that WAS prefilled is no longer empty, so the second case
		// type does not get to overwrite the first one's answer either. This
		// is the documented consequence of the fill-empty-only rule.
		expect(wrapper.vm.formData.status).toBe('st-ontvangen')
	})

	it('does not prefill in edit mode, where a blank field is a decision', async () => {
		mockStore()
		const wrapper = mountForm({
			item: { id: 'case-1', caseType: 'ct-subsidie', title: '', status: '' },
		})
		await flush()

		// Asserting on fetchObject would be wrong here: the reference picker
		// resolves its own label through the same store method, so the call
		// happens either way. The contract is that the stored blanks survive.
		expect(wrapper.vm.prefillDecls).toEqual([])
		expect(wrapper.vm.formData.title).toBe('')
		expect(wrapper.vm.formData.status).toBe('')
	})

	it('prefills a field the form does not render, and submits it', async () => {
		// dossiq wants the case type's initial status stored without putting a
		// status picker in front of someone filing a case, so `status` is
		// prefilled while being absent from includeFields. The payload is
		// built from formData rather than from the rendered fields, which is
		// what makes that work; pin it, because it is not obvious.
		mockStore()
		const wrapper = mountForm({ includeFields: ['caseType', 'title'] })
		await flush()

		wrapper.vm.formData.caseType = 'ct-subsidie'
		await flush()

		expect(wrapper.vm.resolvedFields.map((f) => f.key)).toEqual(['caseType', 'title'])
		expect(wrapper.vm.buildSubmitPayload().status).toBe('st-ontvangen')
	})

	it('survives a case type that answers nothing', async () => {
		mockStore({ 'ct-leeg': { id: 'ct-leeg', title: '' } })
		const wrapper = mountForm()
		await flush()

		wrapper.vm.formData.caseType = 'ct-leeg'
		await flush()

		expect(wrapper.vm.formData.title).toBeFalsy()
		expect(wrapper.vm.formData.status).toBeFalsy()
	})

	it('leaves the form usable when the fetch fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		useObjectStore.mockReturnValue({
			fetchCollection: jest.fn(() => Promise.resolve([])),
			createObjectTypeSlug: (register, schema) => `${register}/${schema}`,
			registerObjectType: jest.fn(),
			objectTypeRegistry: {},
			fetchObject: jest.fn(() => Promise.reject(new Error('gone'))),
		})
		const wrapper = mountForm()
		await flush()

		wrapper.vm.formData.caseType = 'ct-subsidie'
		await flush()

		expect(wrapper.vm.formData.title).toBeFalsy()
		expect(spy).toHaveBeenCalled()
		spy.mockRestore()
	})
})

describe('CnFormDialog two-column layout', () => {
	beforeEach(() => useObjectStore.mockReset())

	it('stays one column by default, so no existing form is reflowed', async () => {
		mockStore()
		const wrapper = mountForm()
		await flush()

		expect(wrapper.find('.cn-form-dialog__form--two-column').exists()).toBe(false)
	})

	it('splits into two columns when the action asks for it', async () => {
		mockStore()
		const wrapper = mountForm({ columns: 2 })
		await flush()

		expect(wrapper.find('.cn-form-dialog__form--two-column').exists()).toBe(true)
	})

	it('gives a textarea the full width, and a single-line field half', async () => {
		mockStore()
		const wrapper = mountForm({
			columns: 2,
			schema: {
				title: 'Case',
				properties: {
					title: { type: 'string', title: 'Title' },
					description: { type: 'string', format: 'textarea', title: 'Description' },
				},
			},
		})
		await flush()

		const wide = wrapper.find('[data-cn-field="description"]')
		const narrow = wrapper.find('[data-cn-field="title"]')
		expect(wide.classes()).toContain('cn-form-dialog__field--wide')
		expect(narrow.classes()).not.toContain('cn-form-dialog__field--wide')
	})

	it('never marks a field wide while the form is single-column', async () => {
		mockStore()
		const wrapper = mountForm({
			schema: {
				title: 'Case',
				properties: {
					description: { type: 'string', format: 'textarea', title: 'Description' },
				},
			},
		})
		await flush()

		expect(wrapper.find('[data-cn-field="description"]').classes())
			.not.toContain('cn-form-dialog__field--wide')
	})
})

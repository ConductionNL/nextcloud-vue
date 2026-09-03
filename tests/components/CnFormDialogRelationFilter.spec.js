/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A scoped reference picker refetches when the value it is scoped BY changes.
 *
 * `x-relation-filter` says "only the statuses of the case type chosen above".
 * `fetchReferenceOptions` resolves it against the live form data, and
 * `initAsyncFields` calls that once, at open. On a CREATE the form is empty at
 * that moment, so `@object.caseType` resolves to nothing, the entry is dropped
 * ("unfiltered beats an empty picker"), and the fetch returns the first hundred
 * rows of the referenced schema. Nothing ever fetched again.
 *
 * Reported on dossiq's New case form: picking a case type left the status
 * picker offering every case type's statuses, four of them named "Received"
 * with nothing on screen to tell them apart.
 */

import { mount } from '@vue/test-utils'

const mockStore = {
	objectTypeRegistry: {},
	createObjectTypeSlug: (...parts) => parts.join('-'),
	registerObjectType: jest.fn((slug) => {
		mockStore.objectTypeRegistry[slug] = {}
	}),
	fetchCollection: jest.fn().mockResolvedValue([
		{ id: 'status-1', title: 'Received' },
		{ id: 'status-2', title: 'In progress' },
	]),
	fetchObject: jest.fn().mockResolvedValue({ id: 'status-1', title: 'Received' }),
}

jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

// Import AFTER the mock is registered.
// eslint-disable-next-line import/first
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button @click="$attrs.onClick && $attrs.onClick()"><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	CnJsonViewer: true,
}

/** The dossiq shape, reduced to the two properties that matter. */
const scopedSchema = {
	title: 'Case',
	properties: {
		caseType: { type: 'string', format: 'uuid', $ref: 'caseType', title: 'Case type', order: 1 },
		status: {
			type: 'string',
			format: 'uuid',
			$ref: 'statusType',
			title: 'Status',
			order: 2,
			'x-relation-filter': { caseType: '@object.caseType' },
		},
	},
}

/** The same form with nothing scoped by another field. */
const plainSchema = {
	title: 'Case',
	properties: {
		caseType: { type: 'string', format: 'uuid', $ref: 'caseType', title: 'Case type', order: 1 },
		status: { type: 'string', format: 'uuid', $ref: 'statusType', title: 'Status', order: 2 },
	},
}

/**
 * Every `fetchCollection` call made for one schema slug.
 *
 * @param {string} slug The referenced schema slug the call must end with.
 * @return {Array<Array>} The matching mock calls, in order.
 */
const callsFor = (slug) =>
	mockStore.fetchCollection.mock.calls.filter(([s]) => String(s).endsWith(slug))

beforeEach(() => {
	mockStore.objectTypeRegistry = {}
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.fetchObject.mockClear()
})

describe('CnFormDialog — a picker scoped by another field', () => {
	it('reports which fields are scoped, and by what', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: scopedSchema, item: null, register: 'dossiq' },
			stubs,
		})

		expect(wrapper.vm.relationFilterDecls).toEqual([
			{ key: 'status', drivers: ['caseType'] },
		])
	})

	it('opens unfiltered, because the driving value does not exist yet', async () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: scopedSchema, item: null, register: 'dossiq' },
			stubs,
		})
		await flushPromises()

		const [, params] = callsFor('statusType')[0]
		expect(params.caseType).toBeUndefined()
		expect(wrapper.vm.formData.caseType).toBeFalsy()
	})

	it('refetches, scoped, once a case type is chosen', async () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: scopedSchema, item: null, register: 'dossiq' },
			stubs,
		})
		await flushPromises()

		const before = callsFor('statusType').length
		expect(before).toBeGreaterThan(0)

		wrapper.vm.updateField('caseType', 'case-type-a')
		await wrapper.vm.$nextTick()
		await flushPromises()

		const after = callsFor('statusType')
		expect(after.length).toBeGreaterThan(before)
		expect(after[after.length - 1][1].caseType).toBe('case-type-a')
	})

	it('refetches again when the case type is changed a second time', async () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: scopedSchema, item: null, register: 'dossiq' },
			stubs,
		})
		await flushPromises()

		wrapper.vm.updateField('caseType', 'case-type-a')
		await wrapper.vm.$nextTick()
		await flushPromises()
		wrapper.vm.updateField('caseType', 'case-type-b')
		await wrapper.vm.$nextTick()
		await flushPromises()

		const calls = callsFor('statusType')
		expect(calls[calls.length - 1][1].caseType).toBe('case-type-b')
	})

	it('leaves the chosen value alone, so a prefill is not undone', async () => {
		// `x-openregister-prefill` reacts to the same change and its whole job
		// is to WRITE this field. Blanking it here would race that.
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: scopedSchema, item: null, register: 'dossiq' },
			stubs,
		})
		await flushPromises()

		wrapper.vm.updateField('status', 'status-1')
		wrapper.vm.updateField('caseType', 'case-type-a')
		await wrapper.vm.$nextTick()
		await flushPromises()

		expect(wrapper.vm.formData.status).toBe('status-1')
	})

	it('does not refetch a picker that is not scoped by another field', async () => {
		// The control. Without it every assertion above would pass on a
		// watcher that simply refetched everything on every keystroke.
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: plainSchema, item: null, register: 'dossiq' },
			stubs,
		})
		await flushPromises()

		expect(wrapper.vm.relationFilterDecls).toEqual([])
		const before = callsFor('statusType').length

		wrapper.vm.updateField('caseType', 'case-type-a')
		await wrapper.vm.$nextTick()
		await flushPromises()

		expect(callsFor('statusType').length).toBe(before)
	})
})

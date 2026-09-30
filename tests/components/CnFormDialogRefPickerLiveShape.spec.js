/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The $ref pickers on learniq's Work group and Session create forms fetch
 * their referenced schema, through the REAL object store.
 *
 * The learniq live lane reported "Class" (Work group) and "Cohort" (Session)
 * as empty pickers. Every other reference test mocks the store, so none of
 * them can see a wrong URL. This one keeps the store real and stubs only
 * `fetch`, with the two schemas exactly as OpenRegister served them on
 * 2026-09-29 (`$ref` authored as a PascalCase title, `register` from the
 * index page's config). `SessionChangeBatch` is the multi-word case: the
 * released 2.57.x asked for `/learniq/SessionChangeBatch` and got a 404.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: true,
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	CnJsonViewer: true,
}

const workGroup = {
	title: 'Work group',
	required: ['cohortId', 'name'],
	properties: {
		cohortId: { $ref: 'Cohort', format: 'uuid', title: 'Class', type: 'string' },
		courseId: { $ref: 'Course', format: 'uuid', nullable: true, title: 'Course', type: 'string' },
		name: { type: 'string', title: 'Name' },
	},
}

const session = {
	title: 'Session',
	required: ['cohortId', 'title'],
	properties: {
		cohortId: { $ref: 'Cohort', format: 'uuid', title: 'Cohort ID', type: 'string' },
		changeBatchId: { $ref: 'SessionChangeBatch', format: 'uuid', nullable: true, title: 'Change batch', type: 'string' },
		title: { type: 'string', title: 'Title' },
	},
}

/**
 * The objects-API paths `fetch` was called with, query string dropped.
 *
 * @return {string[]} The request paths.
 */
const requestedPaths = () => global.fetch.mock.calls.map(([url]) => String(url).split('?')[0])

beforeEach(() => {
	setActivePinia(createPinia())
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: async () => ({ results: [{ id: 'c-1', name: 'DR Groep 1/2', '@self': { name: 'DR Groep 1/2' } }] }),
	})
})

describe('CnFormDialog — $ref pickers on the live learniq shapes', () => {
	it('Work group: Class and Course fetch their schema by slug, in the page\'s register', async () => {
		mount(CnFormDialog, { props: { schema: workGroup, item: null, register: 'learniq' }, global: { stubs } })
		await flushPromises()
		expect(requestedPaths()).toEqual(expect.arrayContaining([
			'/apps/openregister/api/objects/learniq/cohort',
			'/apps/openregister/api/objects/learniq/course',
		]))
	})

	it('Work group: the Class picker offers the fetched classes', async () => {
		const vm = mount(CnFormDialog, { props: { schema: workGroup, item: null, register: 'learniq' }, global: { stubs } }).vm
		await flushPromises()
		const field = vm.visibleFields.find((f) => f.key === 'cohortId')
		expect(vm.getEffectiveOptions(field)).toEqual([{ id: 'c-1', label: 'DR Groep 1/2' }])
	})

	it('Session: Cohort and the multi-word SessionChangeBatch fetch by kebab-case slug', async () => {
		mount(CnFormDialog, { props: { schema: session, item: null, register: 'learniq' }, global: { stubs } })
		await flushPromises()
		expect(requestedPaths()).toEqual(expect.arrayContaining([
			'/apps/openregister/api/objects/learniq/cohort',
			'/apps/openregister/api/objects/learniq/session-change-batch',
		]))
	})
})

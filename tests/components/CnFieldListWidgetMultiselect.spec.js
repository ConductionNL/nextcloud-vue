/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldListWidget: a `multiselect` add field holds a list, `optionsSource`
 * reads choices from an endpoint, and a table column words list values
 * through `labelsFrom`.
 *
 * @spec openspec/changes/field-list-multiselect-and-endpoint-options/specs/field-list/spec.md
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), patch: (...a) => mockPatch(...a), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

import { mount } from '@vue/test-utils'

const CnFieldListWidget = require('../../src/components/CnFieldListWidget/CnFieldListWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const RIGHTS = {
	field: 'rightsMatrix',
	variant: 'table',
	columns: [
		{ header: 'Role', path: 'role' },
		{ header: 'Statuses', path: 'statuses', labelsFrom: 'statuses' },
		{ header: 'Documents', path: 'documentActions', map: { read: 'Read', add: 'Add', delete: 'Delete' } },
	],
	add: {
		trigger: 'button',
		fields: [
			{ key: 'role', label: 'Role', required: true },
			{
				key: 'statuses',
				label: 'Statuses',
				type: 'multiselect',
				optionsSource: { url: '/apps/dossiq/api/case-types/@objectId/statuses', path: 'results', valuePath: 'id', labelPath: 'name' },
			},
			{ key: 'documentActions', label: 'Documents', type: 'multiselect', options: [{ value: 'read', label: 'Read' }, { value: 'add', label: 'Add' }] },
		],
	},
	edit: { label: 'Edit' },
}

const caseType = {
	id: 'ct-1',
	rightsMatrix: [{ role: 'Intaker', statuses: ['st-1', 'st-2'], documentActions: ['read', 'add'] }],
}

/**
 * Mount the list.
 *
 * @return {object} The wrapper.
 */
function mountList() {
	return mount(CnFieldListWidget, {
		props: { content: RIGHTS, objectData: caseType, objectId: 'ct-1', register: 'dossiq', schema: 'caseType' },
		global: {
			provide: { cnTranslate: (key) => key },
			stubs: {
				NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				NcNoteCard: { template: '<div class="note"><slot /></div>' },
				NcTextField: {
					props: ['modelValue', 'label'],
					emits: ['update:modelValue'],
					template: '<label>{{ label }}<input class="text" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
				},
				NcSelect: {
					props: ['modelValue', 'options', 'inputLabel', 'multiple'],
					emits: ['update:modelValue'],
					template: '<div class="select-stub" :data-multiple="String(Boolean(multiple))" :data-options="(options || []).map((o) => o.value + \'=\' + o.label).join(\',\')" />',
				},
				NcCheckboxRadioSwitch: { template: '<label><slot /></label>' },
				CnStatusBadge: { props: ['label'], template: '<span class="pill">{{ label }}</span>' },
			},
		},
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockPatch.mockReset()
	const statuses = { data: { results: [{ id: 'st-1', name: 'Ontvangen' }, { id: 'st-2', name: 'In behandeling' }] } }
	mockGet.mockImplementation((url) => Promise.resolve(url.includes('/statuses') ? statuses : { data: { rightsMatrix: caseType.rightsMatrix } }))
	mockPatch.mockImplementation((url, body) => Promise.resolve({ data: body }))
})

describe('CnFieldListWidget: multiselect and endpoint options', () => {
	it('reads the options from the endpoint, with the object id filled in', async () => {
		const w = mountList()
		await flush()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/dossiq/api/case-types/ct-1/statuses')
		await w.find('[data-testid="cn-field-list-open-add"]').trigger('click')
		const select = w.find('[data-testid="cn-field-list-input-statuses"] .select-stub')
		expect(select.attributes('data-multiple')).toBe('true')
		expect(select.attributes('data-options')).toBe('st-1=Ontvangen,st-2=In behandeling')
	})

	it('words list values by the option labels and the column map', async () => {
		const w = mountList()
		await flush()
		await w.vm.$nextTick()
		const cells = w.findAll('[data-testid="cn-field-list-table"] tbody td').map((td) => td.text())
		expect(cells).toContain('Ontvangen, In behandeling')
		expect(cells).toContain('Read, Add')
	})

	it('saves a list, and an emptied list as empty', async () => {
		const w = mountList()
		await flush()
		// In the table variant edit sits in the row's "..." menu; open the row as it does.
		w.vm.startEdit(w.vm.rows[0])
		await w.vm.$nextTick()
		expect(w.vm.draft.statuses).toEqual(['st-1', 'st-2'])
		w.vm.draft.statuses = []
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		await flush()
		expect(mockPatch.mock.calls[0][1].rightsMatrix).toEqual([{ role: 'Intaker', statuses: [], documentActions: ['read', 'add'] }])
	})

	it('a source that cannot be read keeps the static options', async () => {
		mockGet.mockImplementation(() => Promise.reject(new Error('down')))
		const w = mountList()
		await flush()
		await w.find('[data-testid="cn-field-list-open-add"]').trigger('click')
		expect(w.find('[data-testid="cn-field-list-input-documentActions"] .select-stub').attributes('data-options')).toBe('read=Read,add=Add')
		expect(w.find('[data-testid="cn-field-list-input-statuses"] .select-stub').attributes('data-options')).toBe('')
	})
})

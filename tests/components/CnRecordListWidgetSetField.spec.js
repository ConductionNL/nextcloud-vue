/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `set-field` row action writes one field of the page's record from the
 * row ("Assign" a suggested colleague): a button per row, the done label on
 * the row whose value the record already holds, one PATCH of that field, the
 * saved record handed back to the page, and the list read again.
 *
 * @spec openspec/changes/record-list-set-field/specs/record-list/spec.md#requirement-a-row-can-set-a-field-of-the-page-record
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), patch: (...a) => mockPatch(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))

import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const SUGGESTIONS = [
	{ userId: 'anna', displayName: 'Anna de Vries', workload: 2, maxConcurrent: 10 },
	{ userId: 'bram', displayName: 'Bram Smit', workload: 9, maxConcurrent: 10 },
]

const CONTENT = {
	endpointSource: { url: '/apps/pipelinq/api/routing/suggestions', params: { entityType: 'request', entityId: '@objectId' }, responsePath: 'suggestions' },
	presentation: 'rows',
	title: ['{displayName}', '{userId}'],
	rowActions: [
		{ type: 'set-field', field: 'assignee', value: '{userId}', label: 'Assign', ariaLabel: 'Assign to {displayName}', doneLabel: 'Assigned' },
	],
}

const stubs = {
	NcActions: { template: '<div data-actions><slot /></div>' },
	NcActionButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcButton: { props: ['disabled', 'ariaLabel'], template: '<button v-bind="$attrs" :aria-label="ariaLabel" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
}

/**
 * Mount the list on ticket t-1.
 *
 * @param {object} object The page record.
 * @param {Function} [setObject] The page's setObject.
 * @return {object} The wrapper.
 */
function mountList(object, setObject = jest.fn()) {
	const context = ref({ objectId: 't-1', object, register: 'pipelinq', schema: 'ticket', setObject })
	return mount(CnRecordListWidget, {
		props: { content: CONTENT, objectId: 't-1', objectData: object },
		global: { stubs, provide: { cnObjectContext: context, cnTranslate: (s) => s } },
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockPatch.mockReset()
	invalidateEndpointSourceCache()
	mockGet.mockResolvedValue({ data: { suggestions: SUGGESTIONS } })
})

describe('CnRecordListWidget set-field', () => {
	it('draws a named button per row and the done label where the record already holds the value', async () => {
		const w = mountList({ id: 't-1', assignee: 'bram' })
		await flush()
		const buttons = w.findAll('[data-testid="cn-record-list-set-field"]')
		expect(buttons).toHaveLength(1)
		expect(buttons[0].text()).toBe('Assign')
		expect(buttons[0].attributes('aria-label')).toBe('Assign to Anna de Vries')
		expect(w.find('[data-testid="cn-record-list-set-field-done"]').text()).toBe('Assigned')
	})

	it('patches the one field of the page record, hands the saved record back and reads again', async () => {
		const setObject = jest.fn()
		mockPatch.mockResolvedValue({ data: { id: 't-1', assignee: 'anna' } })
		const w = mountList({ id: 't-1', assignee: '' }, setObject)
		await flush()
		await w.findAll('[data-testid="cn-record-list-set-field"]')[0].trigger('click')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith('/nc/apps/openregister/api/objects/pipelinq/ticket/t-1', { assignee: 'anna' })
		expect(setObject).toHaveBeenCalledWith({ id: 't-1', assignee: 'anna' })
		expect(mockGet).toHaveBeenCalledTimes(2)
	})

	it('shows the refusal and keeps the list', async () => {
		mockPatch.mockRejectedValue({ response: { data: { message: 'You may not assign this ticket' } } })
		const w = mountList({ id: 't-1', assignee: '' })
		await flush()
		await w.findAll('[data-testid="cn-record-list-set-field"]')[0].trigger('click')
		await flush()
		expect(w.text()).toContain('You may not assign this ticket')
		expect(w.findAll('[data-testid="cn-record-list-set-field"]')).toHaveLength(2)
	})

	it('keeps set-field actions out of the row menu', async () => {
		const w = mountList({ id: 't-1', assignee: '' })
		await flush()
		expect(w.find('[data-actions]').exists()).toBe(false)
	})
})

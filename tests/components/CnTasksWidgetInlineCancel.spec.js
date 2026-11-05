/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakTaken draws Annuleren as a secondary button beside Afronden, and the
 * summary ends with a note ("de taken van de hele zaak, ook die van collega's").
 *
 * @spec openspec/changes/tasks-table-inline-cancel-summary-note/specs/record-task-table/spec.md
 */
var mockRefetch = jest.fn(() => Promise.resolve())
var mockState = { data: null, loading: false, error: '' }
var mockPost = jest.fn(() => Promise.resolve({ data: {} }))

jest.mock('../../src/composables/useEndpointSource.js', () => {
	const { computed } = require('vue')
	return {
		useEndpointSource: () => {
			return {
				data: computed(() => mockState.data),
				loading: computed(() => mockState.loading),
				error: computed(() => mockState.error),
				refetch: mockRefetch,
			}
		},
	}
})

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: {} })), post: (...args) => mockPost(...args) },
}))

jest.mock('@nextcloud/auth', () => ({ __esModule: true, getCurrentUser: () => ({ uid: 'pieter' }) }))

jest.mock('../../src/utils/userDisplayName.js', () => ({ userDisplayName: (uid) => ({ pieter: 'Pieter Jansen', lars: 'Lars de Koning' })[uid] || '' }))

import { mount } from '@vue/test-utils'

const CnTasksWidget = require('../../src/components/CnTasksWidget/CnTasksWidget.vue').default

const ROWS = [
	{ uuid: 'done-1', displayTitle: 'Ontvangst bevestigen', state: 'completed', isTerminal: true, assignee: 'pieter' },
	{ uuid: 'open-1', displayTitle: 'Documenten beoordelen', state: 'active', isTerminal: false, assignee: 'lars', priority: 'high', description: '3 van 7 nog open' },
	{ uuid: 'pool-1', displayTitle: 'Advies vragen', state: 'enabled', isTerminal: false },
]

const CONTENT = { variant: 'table', objectUuid: '@objectId', includeDone: true, create: { appId: 'dossiq' }, completeAny: true, cancel: true, limit: 25 }

/**
 * Mount the table.
 *
 * @param {object} [content] The widget content.
 * @return {import('@vue/test-utils').VueWrapper} The widget.
 */
function mountTable(content = CONTENT) {
	return mount(CnTasksWidget, {
		props: { content, objectId: 'case-1' },
		global: { stubs: { NcAvatar: true, NcActions: { template: '<div class="actions"><slot /></div>' }, NcActionButton: { template: '<button class="action" @click="$emit(\'click\')"><slot /></button>' } } },
	})
}

beforeEach(() => {
	mockState.data = { results: ROWS, total: 3 }
	mockPost.mockClear()
	mockRefetch.mockClear()
})

describe('CnTasksWidget table: inline cancel and summary note', () => {
	it('draws Cancel as a button beside Complete and leaves it out of the menu', async () => {
		const w = mountTable({ ...CONTENT, cancelInline: true })
		const button = w.find('[data-testid="cn-tasks-widget-cancel-open-1"]')
		expect(button.classes()).not.toContain('action')
		expect(button.text()).toBe('Cancel')
		expect(w.findAll('.action').filter((a) => a.text() === 'Cancel task')).toHaveLength(0)
		await button.trigger('click')
		expect(mockPost).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks/open-1/cancel', {})
	})

	it('keeps Cancel in the menu without cancelInline (control)', () => {
		const w = mountTable()
		expect(w.find('[data-testid="cn-tasks-widget-cancel-open-1"]').classes()).toContain('action')
	})

	it('appends the summary note', () => {
		const header = mountTable({ ...CONTENT, summaryNote: 'the tasks of the whole case' }).emitted('header').at(-1)[0]
		expect(header.subtitle).toBe('2 open, 1 done · sorted by deadline · the tasks of the whole case')
	})
})

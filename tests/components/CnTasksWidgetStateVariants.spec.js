/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `stateVariants` on CnTasksWidget: the tone of a task's status pill by its
 * engine state (board DqZaakTaken: "In behandeling" purple, "Open" amber,
 * "Klaar" grey). Without it an open task is info and a finished one default.
 *
 * @spec openspec/changes/tasks-state-variants/specs/tasks-state-variants/spec.md#requirement-a-task-status-pill-can-take-its-tone-from-its-state
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

import { flushPromises, mount } from '@vue/test-utils'

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

describe('CnTasksWidget state tones', () => {
	const tones = (wrapper) => wrapper.findAll('.cn-status-badge').map((badge) => badge.classes().find((c) => /^cn-status-badge--/.test(c)))

	it('keeps info for an open task and default for a finished one without stateVariants', async () => {
		const wrapper = mountTable()
		await flushPromises()
		expect(tones(wrapper)).toEqual(['cn-status-badge--info', 'cn-status-badge--info', 'cn-status-badge--default'])
	})

	it('takes the tone from stateVariants, falling back for a state it does not name', async () => {
		const wrapper = mountTable({ ...CONTENT, stateVariants: { active: 'purple', enabled: 'warning', completed: 'nonsense' } })
		await flushPromises()
		expect(tones(wrapper)).toEqual(['cn-status-badge--purple', 'cn-status-badge--warning', 'cn-status-badge--default'])
	})
})

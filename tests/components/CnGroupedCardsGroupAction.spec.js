/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every group of a grouped-cards widget can carry an action, its `@group.<path>`
 * tokens read from that group (DqZaaktype "Taak toevoegen" on a phase).
 *
 * @spec openspec/changes/grouped-cards-group-action/specs/grouped-cards-group-action/spec.md#requirement-every-group-can-carry-an-action
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const CnGroupedCardsWidget = require('../../src/components/CnGroupedCardsWidget/CnGroupedCardsWidget.vue').default

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

/**
 * Let the endpoint read settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const PHASES = { phases: [{ id: 's1', name: 'Ontvangst', order: 1, tasks: [] }, { id: 's 2', name: 'Beoordeling', order: 2, tasks: [] }, { name: 'Zonder id', order: 3, tasks: [] }] }

const CONTENT = {
	endpointSource: { url: '/apps/dossiq/api/case-types/@objectId/phases' },
	groupsPath: 'phases',
	itemsKey: 'tasks',
	groupTitle: '{name}',
	groupAction: {
		id: 'phase-add-task',
		type: 'open-form',
		label: 'Add task',
		endpoint: { url: '/apps/dossiq/api/case-types/@objectId/phases/@group.id/steps', method: 'POST' },
		formProperties: { title: { type: 'string', title: 'Task' } },
	},
}

const stubs = { CnActionButtons: { name: 'CnActionButtons', props: ['actions'], template: '<div class="actions-stub" />' } }

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnGroupedCardsWidget groupAction', () => {
	it('draws the action in every group with the group\'s own values filled in', async () => {
		axios.get.mockResolvedValue({ data: PHASES })
		const w = mount(CnGroupedCardsWidget, { props: { content: CONTENT, objectId: 'ct-1' }, global: { stubs } })
		await flush()
		const actions = w.findAllComponents({ name: 'CnActionButtons' }).map((c) => c.props('actions')[0])
		expect(actions.map((a) => a.endpoint.url)).toEqual([
			'/apps/dossiq/api/case-types/@objectId/phases/s1/steps',
			'/apps/dossiq/api/case-types/@objectId/phases/s%202/steps',
		])
		expect(actions.map((a) => a.id)).toEqual(['phase-add-task-0', 'phase-add-task-1'])
		expect(actions[0].formProperties).toEqual(CONTENT.groupAction.formProperties)
	})

	it('draws no action without a groupAction', async () => {
		axios.get.mockResolvedValue({ data: PHASES })
		const { groupAction, ...plain } = CONTENT
		const w = mount(CnGroupedCardsWidget, { props: { content: plain, objectId: 'ct-1' }, global: { stubs } })
		await flush()
		expect(groupAction).toBeTruthy()
		expect(w.findAllComponents({ name: 'CnActionButtons' })).toHaveLength(0)
	})
})

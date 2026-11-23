/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaaktype's "Fasen en taken" card has a row of buttons under its subtitle,
 * above the phases: "Bekijken als flow" and "Taak toevoegen". A grouped-cards
 * widget's `actions` draws that row, also while it has no groups yet.
 *
 * @spec openspec/changes/grouped-cards-actions/specs/grouped-cards-widget/spec.md#requirement-a-grouped-cards-widget-can-carry-a-row-of-actions-above-its-groups
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

const ACTIONS = [
	{ id: 'view-as-flow', type: 'navigate', label: 'View as flow', icon: 'Sync', route: 'CaseTypeFlow', params: { id: '@objectId' } },
	{ id: 'add-task', type: 'navigate', label: 'Add a task', icon: 'Plus', route: 'CaseTypeFlow', params: { id: '@objectId' } },
]
const CONTENT = { endpointSource: { url: '/apps/dossiq/api/case-types/@objectId/phases' }, groupsPath: 'phases', itemsKey: 'tasks', actions: ACTIONS }
const stubs = { CnActionButtons: { name: 'CnActionButtons', props: ['actions'], template: '<div class="actions-stub" />' } }

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnGroupedCardsWidget actions', () => {
	it('draws the actions in one row before the groups', async () => {
		axios.get.mockResolvedValue({ data: { phases: [{ id: 's1', name: 'Ontvangst', tasks: [] }] } })
		const w = mount(CnGroupedCardsWidget, { props: { content: CONTENT, objectId: 'ct-1' }, global: { stubs } })
		await flush()
		const row = w.find('[data-testid="cn-grouped-cards-actions"]')
		expect(row.exists()).toBe(true)
		expect(w.findComponent({ name: 'CnActionButtons' }).props('actions')).toEqual(ACTIONS)
		expect(w.html().indexOf('cn-grouped-cards-actions')).toBeLessThan(w.html().indexOf('cn-grouped-cards__grid'))
	})

	it('keeps the row while there are no groups', async () => {
		axios.get.mockResolvedValue({ data: { phases: [] } })
		const w = mount(CnGroupedCardsWidget, { props: { content: CONTENT, objectId: 'ct-1' }, global: { stubs } })
		await flush()
		expect(w.find('[data-testid="cn-grouped-cards-actions"]').exists()).toBe(true)
	})

	it('draws no row without actions', async () => {
		axios.get.mockResolvedValue({ data: { phases: [] } })
		const { actions, ...plain } = CONTENT
		const w = mount(CnGroupedCardsWidget, { props: { content: plain, objectId: 'ct-1' }, global: { stubs } })
		await flush()
		expect(actions).toBeTruthy()
		expect(w.find('[data-testid="cn-grouped-cards-actions"]').exists()).toBe(false)
	})
})

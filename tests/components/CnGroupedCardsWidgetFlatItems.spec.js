/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Grouped cards over a payload whose cards are one flat list (goals and the
 * actions under them): cards join their group by id, the loose ones gather
 * under their own title, a late card is flagged in words, and a failed read
 * offers to try again. Ported from dossiq's family plan specs (casePlanTab).
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-grouped-cards-can-join-a-flat-list-and-flag-a-card
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnGroupedCardsWidget from '../../src/components/CnGroupedCardsWidget/CnGroupedCardsWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const PLAN = {
	goals: [{ id: 'g-1', title: 'School every day', metWhen: 'Four weeks without absence' }],
	interventions: [
		{ id: 'i-1', goal: 'g-1', title: 'Morning routine coaching', providerParty: { displayName: 'Buurtteam', telephone: '030-1' }, targetDate: '2026-11-01', overdue: true },
		{ id: 'i-2', goal: '', title: 'Debt counselling', providerName: '' },
	],
}

const CONTENT = {
	endpointSource: { url: '/apps/x/api/plans/@object.planId' },
	groupsPath: 'goals',
	itemsPath: 'interventions',
	itemGroupField: 'goal',
	groupTitle: '{title}',
	groupLines: ['Met when: {metWhen}', 'Closed on {closedDate}: {closedObservation}'],
	itemTitle: '{title}',
	itemMeta: [['{providerParty.displayName} ({providerParty.telephone})', '{providerParty.displayName}', '{providerName}', 'No provider recorded'], 'By {targetDate}'],
	itemFlag: { field: 'overdue', label: 'Overdue' },
	ungroupedTitle: 'Not tied to a goal',
	columns: 1,
	errorText: 'The plan could not be read.',
}

function mountCards() {
	return mount(CnGroupedCardsWidget, { props: { content: CONTENT, objectId: 'r-1', objectData: { id: 'r-1', planId: 'p-1' } } })
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnGroupedCardsWidget — a flat list of cards', () => {
	it('puts each card under its group, and the loose ones under their own title', async () => {
		axios.get.mockResolvedValue({ data: PLAN })
		const w = mountCards()
		await flush()
		expect(axios.get.mock.calls[0][0]).toBe('/nc/apps/x/api/plans/p-1')
		const groups = w.findAll('[data-testid="cn-grouped-cards-group"]')
		expect(groups.map((g) => g.find('h4').text())).toEqual(['School every day', 'Not tied to a goal'])
		expect(groups[0].text()).toContain('Morning routine coaching')
		expect(groups[1].text()).toContain('Debt counselling')
	})

	it('draws the group lines that fill, the first meta candidate that fills, and the flag in words', async () => {
		axios.get.mockResolvedValue({ data: PLAN })
		const w = mountCards()
		await flush()
		expect(w.findAll('[data-testid="cn-grouped-cards-group-line"]').map((l) => l.text())).toEqual(['Met when: Four weeks without absence'])
		const items = w.findAll('[data-testid="cn-grouped-cards-item"]')
		expect(items[0].text()).toContain('Buurtteam (030-1) · By 2026-11-01')
		expect(items[0].find('[data-testid="cn-grouped-cards-flag"]').text()).toBe('Overdue')
		expect(items[1].text()).toContain('No provider recorded')
		expect(items[1].find('[data-testid="cn-grouped-cards-flag"]').exists()).toBe(false)
	})

	it('fails closed with a retry', async () => {
		axios.get.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce({ data: PLAN })
		const w = mountCards()
		await flush()
		expect(w.find('[data-testid="cn-grouped-cards-error"]').text()).toContain('The plan could not be read.')
		await w.find('[data-testid="cn-grouped-cards-retry"]').trigger('click')
		await flush()
		expect(w.findAll('[data-testid="cn-grouped-cards-group"]')).toHaveLength(2)
	})
})

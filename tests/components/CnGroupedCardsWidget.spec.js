/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * grouped-cards-widget: groups of cards side by side, read from an app
 * endpoint (board DqZaaktype, Fasen en taken: each phase with its tasks, and a
 * dashed box of the acts available in every phase).
 *
 * @spec openspec/changes/grouped-cards-widget/specs/grouped-cards-widget/spec.md#requirement-a-widget-draws-groups-of-cards-from-an-endpoint
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'
import { DASHBOARD_CATALOG_WIDGET_KEYS } from '../../src/utils/libraryWidgetKeys.js'

import '../../src/components/CnGroupedCardsWidget/index.js'

const CnGroupedCardsWidget = require('../../src/components/CnGroupedCardsWidget/CnGroupedCardsWidget.vue').default

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const PHASES = {
	phases: [
		{ id: 's1', name: { nl: 'Ontvangst', en: 'Intake' }, order: 1, tasks: [
			{ id: 't1', title: 'Volledigheid toetsen', candidateGroups: ['Intaker'], leadTimeDays: 5 },
			{ id: 't2', title: 'Ontvangstbevestiging', candidateGroups: [], leadTimeDays: 0 },
		] },
		{ id: 's2', name: 'Beoordeling', order: 2, tasks: [] },
	],
	alwaysAvailable: [{ id: 'a', label: 'Termijn opschorten' }, { id: 'b', label: 'Zaak overdragen' }],
}

const CONTENT = {
	endpointSource: { url: '/apps/dossiq/api/case-types/@objectId/phases' },
	groupsPath: 'phases',
	itemsKey: 'tasks',
	groupTitle: 'Phase {order}: {name}',
	groupCount: { one: '{count} task', other: '{count} tasks' },
	itemTitle: '{title}',
	itemMeta: ['{candidateGroups}', '{leadTimeDays} working days'],
	extraGroup: { title: 'Always available', path: 'alwaysAvailable', itemText: '{label}' },
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnGroupedCardsWidget', () => {
	it('registers as a library widget on detail pages and dashboards', () => {
		expect(DASHBOARD_CATALOG_WIDGET_KEYS).toContain('grouped-cards')
		expect(getWidgetTypeEntry('grouped-cards').surfaces).toEqual(['detail-page', 'app-dashboard'])
	})

	// The test runtime's Nextcloud language is English, so a language map reads its `en` text.
	it('draws each group with its title, count and cards, reading the endpoint with the record id', async () => {
		axios.get.mockResolvedValue({ data: PHASES })
		const w = mount(CnGroupedCardsWidget, { props: { content: CONTENT, objectId: 'ct-1' } })
		await flush()
		expect(axios.get.mock.calls[0][0]).toBe('/nc/apps/dossiq/api/case-types/ct-1/phases')
		const groups = w.findAll('[data-testid="cn-grouped-cards-group"]')
		expect(groups.map((g) => g.find('h4').text())).toEqual(['Phase 1: Intake', 'Phase 2: Beoordeling'])
		expect(groups[0].find('[data-testid="cn-grouped-cards-count"]').text()).toBe('2 tasks')
		expect(groups[0].findAll('.cn-grouped-cards__item-title').map((i) => i.text())).toEqual(['Volledigheid toetsen', 'Ontvangstbevestiging'])
		expect(groups[0].findAll('.cn-grouped-cards__item-meta').map((i) => i.text())).toEqual(['Intaker · 5 working days', '0 working days'])
		expect(groups[1].find('.cn-grouped-cards__group-empty').exists()).toBe(true)
		expect(groups[0].attributes('aria-labelledby')).toBe(groups[0].find('h4').attributes('id'))
	})

	it('closes with the dashed box of entries available everywhere, joined on one line', async () => {
		axios.get.mockResolvedValue({ data: PHASES })
		const w = mount(CnGroupedCardsWidget, { props: { content: CONTENT, objectId: 'ct-1' } })
		await flush()
		const extra = w.find('[data-testid="cn-grouped-cards-extra"]')
		expect(extra.find('h4').text()).toBe('Always available')
		expect(extra.find('.cn-grouped-cards__extra-text').text()).toBe('Termijn opschorten · Zaak overdragen')
	})

	it('translates its texts through the app catalogue', async () => {
		axios.get.mockResolvedValue({ data: PHASES })
		const nl = { 'Phase {order}: {name}': 'Fase {order}: {name}', '{count} tasks': '{count} taken', 'Always available': 'Altijd beschikbaar' }
		const w = mount(CnGroupedCardsWidget, {
			props: { content: CONTENT, objectId: 'ct-1' },
			global: { provide: { cnTranslate: (key) => nl[key] || key } },
		})
		await flush()
		expect(w.find('h4').text()).toBe('Fase 1: Intake')
		expect(w.find('[data-testid="cn-grouped-cards-count"]').text()).toBe('2 taken')
		expect(w.find('[data-testid="cn-grouped-cards-extra"] h4').text()).toBe('Altijd beschikbaar')
	})

	it('shows the empty text without groups, and the error text when the endpoint fails', async () => {
		axios.get.mockResolvedValueOnce({ data: { phases: [] } })
		const empty = mount(CnGroupedCardsWidget, { props: { content: { ...CONTENT, extraGroup: undefined, emptyText: 'No phases yet' }, objectId: 'a' } })
		await flush()
		expect(empty.find('[data-testid="cn-grouped-cards-empty"]').text()).toBe('No phases yet')

		axios.get.mockRejectedValueOnce(new Error('500'))
		const failed = mount(CnGroupedCardsWidget, { props: { content: CONTENT, objectId: 'b' } })
		await flush()
		expect(failed.find('[data-testid="cn-grouped-cards-error"]').exists()).toBe(true)
	})
})

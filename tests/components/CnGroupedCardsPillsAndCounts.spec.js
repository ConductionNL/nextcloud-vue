/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqSociaalDomein's Gezinsplan: each goal carries a state pill (Loopt,
 * Gehaald), each intervention a date and a state pill (Gepland, Bezig,
 * Afgerond, or Te laat in the error tone), and the card says "2 doelen,
 * 3 interventies" under its title.
 *
 * @spec openspec/changes/grouped-cards-pills-and-counts/specs/grouped-cards-widget/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const CnGroupedCardsWidget = require('../../src/components/CnGroupedCardsWidget/CnGroupedCardsWidget.vue').default

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

/** @return {Promise<void>} */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const PAYLOAD = {
	goals: [
		{ id: 'g1', name: 'Kinderen gaan weer naar school', state: 'open', interventions: [
			{ id: 'i1', what: 'Schoolbegeleiding', state: 'running', targetDate: '2099-03-01' },
			{ id: 'i2', what: 'Huiswerkklas', state: 'planned', targetDate: '2000-01-10' },
		] },
		{ id: 'g2', name: 'Vaste dagstructuur', state: 'met', interventions: [
			{ id: 'i3', what: 'Gezinscoach', state: 'complete', targetDate: '2000-01-10' },
		] },
	],
}

const CONTENT = {
	endpointSource: { url: '/apps/dossiq/api/cases/@objectId/family-plan' },
	groupsPath: 'goals',
	itemsKey: 'interventions',
	itemTitle: '{what}',
	groupPill: { field: 'state', labels: { open: 'Loopt', met: 'Gehaald' }, colorMap: { open: 'info', met: 'success' } },
	itemPill: {
		field: 'state',
		labels: { planned: 'Gepland', running: 'Bezig', complete: 'Afgerond' },
		colorMap: { planned: 'default', running: 'info', complete: 'success' },
		overdueWhen: { all: [{ field: 'targetDate', op: 'lt', value: '@today' }, { field: 'state', op: 'neq', value: 'complete' }] },
		overdueLabel: 'Te laat',
	},
	itemDate: '{targetDate}',
}

const stubs = { CnStatusBadge: { name: 'CnStatusBadge', props: ['label', 'variant'], template: '<span class="pill" :data-variant="variant">{{ label }}</span>' } }

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: PAYLOAD })
})

describe('CnGroupedCardsWidget pills and counts', () => {
	it('draws the group pill from the group', async () => {
		const w = mount(CnGroupedCardsWidget, { props: { content: CONTENT, objectId: 'c1' }, global: { stubs } })
		await flush()
		const pills = w.findAll('[data-testid="cn-grouped-cards-group-pill"]')
		expect(pills.map((p) => p.text())).toEqual(['Loopt', 'Gehaald'])
		expect(pills.map((p) => p.attributes('data-variant'))).toEqual(['info', 'success'])
	})

	it('draws the card date and pill, overdue in the error tone', async () => {
		const w = mount(CnGroupedCardsWidget, { props: { content: CONTENT, objectId: 'c1' }, global: { stubs } })
		await flush()
		const pills = w.findAll('[data-testid="cn-grouped-cards-item-pill"]')
		expect(pills.map((p) => p.text())).toEqual(['Bezig', 'Te laat', 'Afgerond'])
		expect(pills[1].attributes('data-variant')).toBe('error')
		expect(w.findAll('[data-testid="cn-grouped-cards-item-date"]').map((d) => d.text())).toEqual(['2099-03-01', '2000-01-10', '2000-01-10'])
	})

	it('reports the counts under the card title', async () => {
		const content = {
			...CONTENT,
			headerSubtitle: {
				parts: [
					{ count: 'groups', one: '{count} doel', other: '{count} doelen' },
					{ count: 'items', one: '{count} interventie', other: '{count} interventies' },
				],
				suffix: 'een doel zegt waaraan u ziet dat het gelukt is',
			},
		}
		const w = mount(CnGroupedCardsWidget, { props: { content, objectId: 'c1' }, global: { stubs } })
		await flush()
		const emitted = w.emitted('header')
		expect(emitted[emitted.length - 1]).toEqual([{ subtitle: '2 doelen, 3 interventies · een doel zegt waaraan u ziet dat het gelukt is' }])
	})

	it('fills {groups} and {items} in a plain template', async () => {
		const w = mount(CnGroupedCardsWidget, { props: { content: { ...CONTENT, headerSubtitle: '{groups} / {items}' }, objectId: 'c1' }, global: { stubs } })
		await flush()
		const emitted = w.emitted('header')
		expect(emitted[emitted.length - 1]).toEqual([{ subtitle: '2 / 3' }])
	})

	it('draws no pills, date or header without the keys (control)', async () => {
		const w = mount(CnGroupedCardsWidget, { props: { content: { endpointSource: CONTENT.endpointSource, groupsPath: 'goals', itemsKey: 'interventions' }, objectId: 'c1' }, global: { stubs } })
		await flush()
		expect(w.findAll('.pill')).toHaveLength(0)
		expect(w.find('[data-testid="cn-grouped-cards-item-date"]').exists()).toBe(false)
		expect(w.emitted('header')).toBeUndefined()
	})
})

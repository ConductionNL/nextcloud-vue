/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * party-actions-widget: one band on a contact person's or organisation's page
 * with what to watch out for and the quick actions (boards PqKlant and
 * PqOrganisatie). Indicators show when their condition holds against the page
 * object; without one the band says its empty sentence and offers the empty
 * actions; the quick actions are action descriptors drawn by CnActionButtons.
 *
 * @spec openspec/changes/party-actions-widget/specs/party-actions-widget/spec.md#requirement-a-party-page-draws-one-band-of-indicators-and-quick-actions
 */
import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { DASHBOARD_CATALOG_WIDGET_KEYS } from '../../src/utils/libraryWidgetKeys.js'

import '../../src/components/CnPartyActionsWidget/index.js'

const CnPartyActionsWidget = require('../../src/components/CnPartyActionsWidget/CnPartyActionsWidget.vue').default

const ACTIONS = [
	{ id: 'call', label: 'Call', icon: 'Phone', type: 'navigate', target: 'tel:@object.phone' },
	{ id: 'visit', label: 'Log visit', type: 'open-modal', target: 'LogVisit' },
	{ label: 'No id' },
]

const CONTENT = {
	indicators: [
		{ id: 'aggression', label: 'Aggressive behaviour reported', tone: 'error', visibleWhen: { field: 'aggression', op: 'eq', value: true } },
		{ id: 'debt', label: 'Debt: {debt}', visibleWhen: { field: 'debt', op: 'gt', value: 0 } },
		{ id: 'note', label: 'Note: {note}' },
	],
	emptyText: 'No warnings for this resident.',
	emptyActions: [{ id: 'add-warning', label: 'Add warning', type: 'open-form' }],
	actions: ACTIONS,
}

/**
 * @param {object} objectData The page object.
 * @return {object} Wrapper.
 */
function mountBand(objectData) {
	return mount(CnPartyActionsWidget, {
		props: { content: CONTENT, objectData },
		global: {
			provide: { cnTranslate: (key) => key },
			stubs: { CnActionButtons: { name: 'CnActionButtons', props: ['actions'], template: '<div class="actions-stub" />' } },
		},
	})
}

describe('CnPartyActionsWidget', () => {
	it('registers as a detail-page catalog widget the validator knows', () => {
		expect(getWidgetTypeEntry('party-actions').surfaces).toEqual(['detail-page'])
		expect(DASHBOARD_CATALOG_WIDGET_KEYS).toContain('party-actions')
	})

	it('shows the indicators whose condition holds, with their tone and filled label', () => {
		const w = mountBand({ aggression: true, debt: 120 })
		const shown = w.findAll('.cn-party-actions-widget__indicator')
		expect(shown.map((li) => li.text())).toEqual(['Aggressive behaviour reported', 'Debt: 120'])
		expect(shown[0].classes()).toContain('cn-party-actions-widget__indicator--error')
		expect(shown[1].classes()).toContain('cn-party-actions-widget__indicator--warning')
		expect(w.find('[data-testid="cn-party-actions-empty"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-party-actions-add"]').exists()).toBe(false)
	})

	it('says the empty sentence and offers the empty actions without a shown indicator', () => {
		const w = mountBand({ aggression: false, debt: 0 })
		expect(w.findAll('.cn-party-actions-widget__indicator')).toHaveLength(0)
		expect(w.find('[data-testid="cn-party-actions-empty"]').text()).toBe('No warnings for this resident.')
		expect(w.findComponent('[data-testid="cn-party-actions-add"]').props('actions').map((a) => a.id)).toEqual(['add-warning'])
	})

	it('hands the quick actions with an id and a label to CnActionButtons, inline', () => {
		const w = mountBand({})
		const quick = w.findComponent('[data-testid="cn-party-actions-quick"]').props('actions')
		expect(quick.map((a) => a.id)).toEqual(['call', 'visit'])
		expect(quick.every((a) => a.inline === true && a.variant === 'secondary')).toBe(true)
		expect(quick[0].target).toBe('tel:@object.phone')
	})
})

describe('CnPartyActionsWidget: indicators kept as objects', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('lists the source rows for this party, label and tone read through the extend and the tone map', async () => {
		global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ results: [
			{ id: 'v1', indicator: { label: 'Interpreter needed', severity: 'low' } },
			{ id: 'v2', indicator: { label: 'Aggression reported', severity: 'high' } },
		] }) }))
		const w = mount(CnPartyActionsWidget, {
			props: {
				objectId: 'p-1',
				objectData: { id: 'p-1' },
				content: {
					emptyText: 'No warnings.',
					indicatorSource: { register: 'pipelinq', schema: 'partyIndicatorValue', filter: { party: '@objectId' }, extend: ['indicator'], labelPath: 'indicator.label', tonePath: 'indicator.severity', toneMap: { high: 'error', low: 'info' } },
				},
			},
			global: { provide: { cnTranslate: (key) => key }, stubs: { CnActionButtons: true } },
		})
		await new Promise((resolve) => setTimeout(resolve, 0))
		await w.vm.$nextTick()
		const url = global.fetch.mock.calls[0][0]
		expect(url).toContain('/apps/openregister/api/objects/pipelinq/partyIndicatorValue')
		expect(url).toContain('party=p-1')
		expect(decodeURIComponent(url)).toContain('_extend=indicator')
		const shown = w.findAll('.cn-party-actions-widget__indicator')
		expect(shown.map((li) => li.text())).toEqual(['Interpreter needed', 'Aggression reported'])
		expect(shown[1].classes()).toContain('cn-party-actions-widget__indicator--error')
		expect(w.find('[data-testid="cn-party-actions-empty"]').exists()).toBe(false)
	})

	it('sends no request without the party id', async () => {
		global.fetch = jest.fn()
		mount(CnPartyActionsWidget, {
			props: { content: { indicatorSource: { register: 'r', schema: 's', filter: { party: '@objectId' }, labelPath: 'label' } } },
			global: { stubs: { CnActionButtons: true } },
		})
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(global.fetch).not.toHaveBeenCalled()
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaak "Aanvrager": the lead's subtitle names how the requester logged in
 * ("Logged in with DigiD"), else what kind of requester it is, and the foot
 * link opens the contact or the organisation page by the requester's kind.
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

/**
 * @param {object} content The widget content.
 * @param {object} record The record shown.
 * @return {object} The wrapper.
 */
function mountFacts(content, record) {
	return mount(CnFactsWidget, {
		props: { content, objectId: 'case-1', objectData: record },
		global: {
			stubs: {
				NcLoadingIcon: true,
				RouterLink: { props: ['to'], template: '<a class="stub-link" :data-to="JSON.stringify(to)"><slot /></a>' },
			},
		},
	})
}

const CONTENT = {
	fields: [{
		as: 'lead',
		title: 'initiatorDisplayName',
		initialsPath: 'initiatorDisplayName',
		subtitle: {
			firstOf: [
				{ path: 'intakeIdentification', map: { digid: 'Logged in with DigiD', eherkenning: 'Logged in with eHerkenning' } },
				{ path: 'initiatorType', map: { person: 'Person', company: 'Company' } },
			],
		},
	}],
	link: {
		label: 'View contact details',
		route: { nameField: 'initiatorType', nameMap: { person: 'ContactDetail', company: 'OrganisationDetail' }, params: { id: '@source.requester' } },
	},
}

describe('CnFactsWidget firstOf and a route picked by value', () => {
	it('takes the first subtitle that gives text', () => {
		const w = mountFacts(CONTENT, { initiatorDisplayName: 'Sanne de Vries', initiatorType: 'person', intakeIdentification: 'digid', requester: 'p-1' })
		expect(w.find('.cn-facts-widget__lead-subtitle').text()).toBe('Logged in with DigiD')
	})

	it('falls back to the next spec when the first is empty', () => {
		const w = mountFacts(CONTENT, { initiatorDisplayName: 'Bakkerij Jansen', initiatorType: 'company', requester: 'o-1' })
		expect(w.find('.cn-facts-widget__lead-subtitle').text()).toBe('Company')
	})

	it('picks the link route by the record value', () => {
		const person = mountFacts(CONTENT, { initiatorDisplayName: 'Sanne de Vries', initiatorType: 'person', requester: 'p-1' })
		expect(JSON.parse(person.find('.stub-link').attributes('data-to'))).toEqual({ name: 'ContactDetail', params: { id: 'p-1' } })
		const company = mountFacts(CONTENT, { initiatorDisplayName: 'Bakkerij Jansen', initiatorType: 'company', requester: 'o-1' })
		expect(JSON.parse(company.find('.stub-link').attributes('data-to'))).toEqual({ name: 'OrganisationDetail', params: { id: 'o-1' } })
	})

	it('draws no link for a value missing from the map', () => {
		const w = mountFacts(CONTENT, { initiatorDisplayName: 'Anne', initiatorType: 'contact', requester: 'c-1' })
		expect(w.find('.stub-link').exists()).toBe(false)
	})
})

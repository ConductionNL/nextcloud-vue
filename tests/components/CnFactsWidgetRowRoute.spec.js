/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaaktypeVelden's Moedertype card: "Erft van" links to the parent case
 * type. A row with a `route` draws its value as a link to that route, its
 * params filled from the record (`@source.<path>`). A param that does not
 * fill leaves the value plain.
 *
 * @spec openspec/changes/facts-row-route/specs/facts-widget/spec.md#requirement-a-facts-row-can-link-its-value-to-a-route
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
		props: { content, objectId: 'ct-1', objectData: record },
		global: {
			stubs: {
				NcLoadingIcon: true,
				RouterLink: { props: ['to'], template: '<a class="stub-link" :data-to="JSON.stringify(to)"><slot /></a>' },
			},
		},
	})
}

const FIELD = { label: 'Inherits from', path: 'parentName', route: { name: 'CaseTypeDetail', params: { id: '@source.parentCaseType' } } }

describe('CnFactsWidget row route', () => {
	it('links the value to the route with the record filled in', () => {
		const w = mountFacts({ fields: [FIELD] }, { parentName: 'Omgevingsvergunning', parentCaseType: 'ct-0' })
		const link = w.find('.cn-facts-widget__value .stub-link')
		expect(link.text()).toBe('Omgevingsvergunning')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'CaseTypeDetail', params: { id: 'ct-0' } })
	})

	it('keeps the value plain when a param does not fill', () => {
		const w = mountFacts({ fields: [FIELD] }, { parentName: 'Omgevingsvergunning' })
		expect(w.find('.cn-facts-widget__value .stub-link').exists()).toBe(false)
		expect(w.find('.cn-facts-widget__value').text()).toBe('Omgevingsvergunning')
	})
})

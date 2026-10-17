/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * facts-columns: the board DqContact "Contact" card is a two-column grid of
 * facts, label above value, reading nested fields (name.givenNames,
 * residence.*) and joining the address on one row. `columns: 2` lays the rows
 * out that way, and a row with `parts` joins them like a line. Without the key
 * the rows stay label beside value, as before.
 *
 * @spec openspec/changes/facts-columns/specs/facts-widget/spec.md#requirement-facts-rows-can-sit-in-two-columns
 */
import { mount } from '@vue/test-utils'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'

const PERSON = {
	id: 'p-1',
	displayName: 'Sanne de Vries',
	name: { givenNames: 'Sanne Johanna', surname: 'de Vries' },
	residence: { street: 'Parkstraat', houseNumber: '24', postcode: '3421 AB', city: 'Zuiddrecht' },
}

/**
 * @param {object} content Widget content.
 * @return {object} Wrapper.
 */
function mountFacts(content) {
	return mount(CnFactsWidget, {
		props: { objectData: PERSON, content },
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcLoadingIcon: true } },
	})
}

const FIELDS = [
	{ path: 'displayName', label: 'Name' },
	{ path: 'name.givenNames', label: 'Given names' },
	{ path: 'name.surname', label: 'Surname' },
	{ key: 'address', label: 'Address', parts: [{ parts: ['residence.street', 'residence.houseNumber'], separator: ' ' }, 'residence.postcode', 'residence.city'], separator: ', ' },
]

describe('CnFactsWidget: two columns', () => {
	it('reads nested paths and joins a row\'s parts', () => {
		const w = mountFacts({ columns: 2, fields: FIELDS })
		expect(w.find('[data-testid="cn-fact-name-givenNames"] dd').text()).toBe('Sanne Johanna')
		expect(w.find('[data-testid="cn-fact-address"] dd').text()).toBe('Parkstraat 24, 3421 AB, Zuiddrecht')
	})

	it('lays the rows out in two columns only with columns: 2', () => {
		expect(mountFacts({ columns: 2, fields: FIELDS }).find('dl').classes()).toContain('cn-facts-widget__rows--columns')
		expect(mountFacts({ fields: FIELDS }).find('dl').classes()).not.toContain('cn-facts-widget__rows--columns')
	})
})

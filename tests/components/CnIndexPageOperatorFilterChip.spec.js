/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column filter that writes an operator key (`address[like]`) reads on its
 * Active chip as the field's name and the value, never the key with its
 * operator: "Street: Lindelaan", as PqEvenement's Aanmeldingen draws it.
 */
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

/**
 * @param {object} own The page state the chip reads.
 * @return {object} A page-like `this` with the chip methods.
 */
function page(own = {}) {
	const vm = {
		filterLabels: {},
		effectiveSchema: { properties: { address: { title: 'Address' } } },
		sidebar: null,
		sourceConfig: null,
		columns: [],
		refLabels: {},
		effectiveFacetData: {},
		cnTranslate: (key) => key,
		...own,
	}
	for (const [name, fn] of Object.entries(CnIndexPage.methods)) {
		vm[name] = fn.bind(vm)
	}
	return vm
}

describe('an operator filter on its Active chip', () => {
	it('names the field by its schema title, without the operator', () => {
		expect(page().filterChipsOf({ 'address[like]': 'Lindelaan' })).toEqual([
			{ key: 'address[like]', label: 'Address: Lindelaan' },
		])
	})

	it('takes the page\'s filterLabels word for the field', () => {
		const chips = page({ filterLabels: { address: { label: 'Street' } } }).filterChipsOf({ 'address[like]': 'Lindelaan' })
		expect(chips[0].label).toBe('Street: Lindelaan')
	})

	it('takes the column\'s label when nothing else names the field', () => {
		const chips = page({ effectiveSchema: { properties: {} }, columns: [{ key: 'address', label: 'Street' }] })
			.filterChipsOf({ 'address[like]': 'Lindelaan' })
		expect(chips[0].label).toBe('Street: Lindelaan')
	})

	it('keeps a label declared for the whole operator key', () => {
		const chips = page({ filterLabels: { 'address[like]': { label: 'Street contains' } } }).filterChipsOf({ 'address[like]': 'Lindelaan' })
		expect(chips[0].label).toBe('Street contains: Lindelaan')
	})
})

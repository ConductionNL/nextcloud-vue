/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZakenKaart: the card under the map list names the cases without a place,
 * "Bezwaar parkeerboete Havenstraat, Aanbesteding jeugdzorg 2026 en Rapport
 * luchtkwaliteit 2025 hebben geen locatie, dus staan ze niet op de kaart."
 * Past three names the rest are counted.
 *
 * @spec openspec/changes/map-missing-card-names-the-cases/specs/map-missing-card-names-the-cases/spec.md#requirement-the-missing-address-card-names-the-cases-it-counts
 */
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

/**
 * @param {Array<string>} titles The titles of the rows without a place.
 * @return {string} The note.
 */
function note(titles) {
	const c = {
		mapConfig: { list: { title: '{title}' } },
		mapList: { items: [], missing: titles.map((title, i) => ({ id: `c${i}`, title })) },
		cnTranslate: (s) => s,
	}
	return CnIndexPage.computed.mapMissingNote.call(c)
}

describe('the missing-address card note', () => {
	it('names up to three cases', () => {
		expect(note(['Bezwaar parkeerboete Havenstraat', 'Aanbesteding jeugdzorg 2026', 'Rapport luchtkwaliteit 2025']))
			.toBe('Bezwaar parkeerboete Havenstraat, Aanbesteding jeugdzorg 2026, and Rapport luchtkwaliteit 2025 have no location, so they are not on the map.')
	})

	it('reads in the singular for one', () => {
		expect(note(['Bezwaar parkeerboete Havenstraat'])).toBe('Bezwaar parkeerboete Havenstraat has no location, so it is not on the map.')
	})

	it('counts the rest past three', () => {
		expect(note(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C, and 2 others have no location, so they are not on the map.')
	})

	it('says nothing without a list title to name them by', () => {
		const c = { mapConfig: { list: {} }, mapList: { items: [], missing: [{ id: 'x' }] }, cnTranslate: (s) => s }
		expect(CnIndexPage.computed.mapMissingNote.call(c)).toBe('')
	})
})

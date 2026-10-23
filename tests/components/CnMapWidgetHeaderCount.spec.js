/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A map card can say how many places it shows under its title ("1 locatie",
 * the case "Locaties" card on DqZaak and the case tabs): `content.headerSubtitle`
 * is `{ one, other }` (or one string) with `{total}`, through the host
 * translate, reported once the marker source answered with markers.
 *
 * @spec openspec/changes/map-widget-header-count/specs/map-widget-header-count/spec.md#requirement-a-map-card-can-say-how-many-places-it-shows
 */
jest.mock('leaflet', () => ({ __esModule: true, default: {} }))

import CnMapWidget from '@/components/CnMapWidget/CnMapWidget.vue'

const NL = { '{total} location': '{total} locatie', '{total} locations': '{total} locaties' }
const subtitle = (ctx) => CnMapWidget.computed.headerSubtitleText.call({ cnTranslate: (k) => NL[k] ?? k, ...ctx })
const SUB = { one: '{total} location', other: '{total} locations' }

describe('CnMapWidget header count', () => {
	it('says one place in the singular and more in the plural', () => {
		expect(subtitle({ content: { headerSubtitle: SUB }, markersLoaded: true, markersFailed: false, markerCount: 1 })).toBe('1 locatie')
		expect(subtitle({ content: { headerSubtitle: SUB }, markersLoaded: true, markersFailed: false, markerCount: 3 })).toBe('3 locaties')
	})

	it('takes one string for every count', () => {
		expect(subtitle({ content: { headerSubtitle: '{total} places' }, markersLoaded: true, markersFailed: false, markerCount: 2 })).toBe('2 places')
	})

	it('says nothing before the source answered, when it failed, or without places', () => {
		expect(subtitle({ content: { headerSubtitle: SUB }, markersLoaded: false, markersFailed: false, markerCount: 0 })).toBe('')
		expect(subtitle({ content: { headerSubtitle: SUB }, markersLoaded: true, markersFailed: true, markerCount: 0 })).toBe('')
		expect(subtitle({ content: { headerSubtitle: SUB }, markersLoaded: true, markersFailed: false, markerCount: 0 })).toBe('')
		expect(subtitle({ content: {}, markersLoaded: true, markersFailed: false, markerCount: 2 })).toBe('')
	})

	it('reports the line to the card around it', () => {
		const emit = jest.fn()
		CnMapWidget.watch.headerSubtitleText.call({ $emit: emit, content: { headerSubtitle: SUB } }, '1 locatie')
		expect(emit).toHaveBeenCalledWith('header', { subtitle: '1 locatie' })
		expect(CnMapWidget.emits).toContain('header')
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZakenKaart: the map with a numbered list beside it. The list numbers the
 * rows that have a place, the pins carry the same numbers, the row under the
 * pointer is marked on both, the rows without a place are counted with a link
 * to the table, `mapConfig.zoom` reaches the map, and the count line adds how
 * many are on the map.
 */
import { mapListItems } from '../../src/utils/mapList.js'

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const ROWS = [
	{ id: 'c1', title: 'Verlichting fietspad Lindelaan', address: 'Lindelaan 4', identifier: '2026-0082', status: 'open', lat: 51.8, lng: 4.6 },
	{ id: 'c2', title: 'Bezwaar parkeerboete Havenstraat', address: '', identifier: '2026-0074', status: 'late' },
	{ id: 'c3', title: 'Subsidie buurtfeest Oosthaven', address: 'Oosthaven 1', identifier: '2026-0070', status: 'open', lat: 51.81, lng: 4.61 },
]
const LIST = {
	title: '{title}',
	sub: '{address} · {identifier}',
	pills: [{ path: 'status', map: { open: 'In behandeling', late: 'Te laat' }, colorMap: { open: 'purple', late: 'error' } }],
}
const located = (row) => typeof row.lat === 'number'

describe('mapListItems', () => {
	it('numbers the rows with a place in list order and keeps the others apart', () => {
		const { items, missing } = mapListItems(ROWS, LIST, { rowKey: 'id', located })
		expect(items.map((item) => [item.n, item.key, item.title, item.sub])).toEqual([
			[1, 'c1', 'Verlichting fietspad Lindelaan', 'Lindelaan 4 · 2026-0082'],
			[2, 'c3', 'Subsidie buurtfeest Oosthaven', 'Oosthaven 1 · 2026-0070'],
		])
		expect(missing.map((row) => row.id)).toEqual(['c2'])
	})

	it('maps and colours a pill, translated, and drops an empty one', () => {
		const { items } = mapListItems(ROWS, LIST, { rowKey: 'id', located, translate: (s) => s.toUpperCase() })
		expect(items[0].pills).toEqual([{ label: 'IN BEHANDELING', variant: 'purple' }])
		const bare = mapListItems([{ id: 'x', title: 'X', lat: 1 }], LIST, { rowKey: 'id', located })
		expect(bare.items[0].pills).toEqual([])
	})
})

/**
 * A stand-in for the page's `this` on the map with its list.
 *
 * @param {object} over Fields to set.
 * @return {object} The context.
 */
function ctx(over = {}) {
	const c = {
		mapConfig: { latField: 'lat', lngField: 'lng', list: LIST, zoom: 13 },
		displayObjects: ROWS,
		rowKey: 'id',
		activeMapKey: '',
		cnTranslate: (s) => s,
		currentViewMode: 'map',
		headerDescriptionBase: '3 of 3',
		resolveRowGeometry: (row) => (typeof row.lat === 'number' ? { type: 'Point', coordinates: [row.lng, row.lat] } : null),
		...over,
	}
	c.mapListEnabled = CnIndexPage.computed.mapListEnabled.call(c)
	c.mapList = CnIndexPage.computed.mapList.call(c)
	return c
}

describe('CnIndexPage map with a list', () => {
	it('is on only with a list title', () => {
		expect(ctx().mapListEnabled).toBe(true)
		expect(ctx({ mapConfig: { latField: 'lat' } }).mapListEnabled).toBe(false)
	})

	it('numbers the pins as the list, and marks the active row\'s pin', () => {
		const c = ctx({ activeMapKey: 'c3' })
		const { features } = CnIndexPage.computed.mapMarkers.call(c)
		expect(features.map((f) => [f.properties.id, f.properties.markerNumber, f.properties.markerActive])).toEqual([['c1', 1, false], ['c3', 2, true]])
	})

	it('draws plain pins without the list', () => {
		const c = ctx({ mapConfig: { latField: 'lat', lngField: 'lng' } })
		const { features } = CnIndexPage.computed.mapMarkers.call(c)
		expect(features.every((f) => f.properties.markerNumber === undefined)).toBe(true)
	})

	it('passes mapConfig.zoom to the map', () => {
		expect(CnIndexPage.computed.mapZoom.call(ctx())).toBe(13)
		expect(CnIndexPage.computed.mapZoom.call(ctx({ mapConfig: { zoom: 'far' } }))).toBeUndefined()
	})

	it('adds how many are on the map to the count line, only on the map with its list', () => {
		expect(CnIndexPage.computed.headerDescription.call(ctx())).toBe('3 of 3 · 2 with an address on the map')
		expect(CnIndexPage.computed.headerDescription.call(ctx({ currentViewMode: 'table' }))).toBe('3 of 3')
	})

	it('counts the rows without a place', () => {
		expect(CnIndexPage.computed.mapMissingTitle.call(ctx())).toBe('1 without an address')
	})
})

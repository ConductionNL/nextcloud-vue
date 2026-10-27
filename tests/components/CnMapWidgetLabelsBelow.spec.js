/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaak "Locaties": the map card names its places on a line under the map
 * (`content.labelsBelow`), each marker's `markers.popupField` value.
 */
jest.mock('leaflet', () => ({ __esModule: true, default: {} }))

import CnMapWidget from '@/components/CnMapWidget/CnMapWidget.vue'

const caption = (ctx) => CnMapWidget.computed.markerCaption.call({ markersLoaded: true, markersFailed: false, markerLabels: [], ...ctx })
const labelsOf = (markers, features) => CnMapWidget.methods.labelsOf.call({ cfg: { markers } }, features)

describe('CnMapWidget labels below the map', () => {
	it('reads the popup field of each marker, skipping empty ones', () => {
		const features = [
			{ properties: { label: ' Fietspad Lindelaan, tussen nummer 2 en 40 ' } },
			{ properties: { label: '' } },
			{ properties: {} },
			{ properties: { label: 'Lichtmast 14' } },
		]
		expect(labelsOf({ popupField: 'label' }, features)).toEqual(['Fietspad Lindelaan, tussen nummer 2 en 40', 'Lichtmast 14'])
		expect(labelsOf({}, features)).toEqual([])
	})

	it('joins them on one line when content.labelsBelow is on', () => {
		expect(caption({ content: { labelsBelow: true }, markerLabels: ['Fietspad Lindelaan', 'Lichtmast 14'] })).toBe('Fietspad Lindelaan, Lichtmast 14')
	})

	it('says nothing without the option, before the source answered, or when it failed', () => {
		expect(caption({ content: {}, markerLabels: ['Fietspad Lindelaan'] })).toBe('')
		expect(caption({ content: { labelsBelow: true }, markersLoaded: false, markerLabels: ['Fietspad Lindelaan'] })).toBe('')
		expect(caption({ content: { labelsBelow: true }, markersFailed: true, markerLabels: ['Fietspad Lindelaan'] })).toBe('')
	})
})

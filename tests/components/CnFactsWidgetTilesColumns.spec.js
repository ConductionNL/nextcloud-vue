/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tiles in columns: board PqJourney draws a journey's steps as three tiles in
 * a row (Trigger, Wachten, Voorwaarde) and the Actie tile on its own row
 * across the card. `columns` with `layout: "tiles"` sets the tiles in that
 * many columns, and a field with `wide: true` spans the whole row.
 *
 * @spec openspec/changes/facts-tiles-columns/specs/facts-widget/spec.md#requirement-tiles-can-sit-in-columns-and-a-tile-can-span-the-row
 */
import { mount } from '@vue/test-utils'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'

const JOURNEY = { trigger: 'Nieuw adres', waitFor: '3 dagen', condition: 'Toestemming', action: 'Nieuwsbrief versturen' }

/**
 * @param {object} content Widget content.
 * @return {object} Wrapper.
 */
function mountFacts(content) {
	return mount(CnFactsWidget, {
		props: { objectData: JOURNEY, content },
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcLoadingIcon: true } },
	})
}

const FIELDS = [
	{ path: 'trigger', label: 'Trigger' },
	{ path: 'waitFor', label: 'Wait' },
	{ path: 'condition', label: 'Condition' },
	{ path: 'action', label: 'Action', wide: true },
]

describe('CnFactsWidget tiles in columns', () => {
	it('sets the tiles in the given number of columns', () => {
		const rows = mountFacts({ layout: 'tiles', columns: 3, fields: FIELDS }).find('.cn-facts-widget__rows')
		expect(rows.classes()).toContain('cn-facts-widget__rows--tiles')
		expect(rows.classes()).toContain('cn-facts-widget__rows--tile-grid')
		expect(rows.attributes('style')).toContain('--cn-facts-tile-columns: 3')
	})

	it('lets a wide tile span the whole row', () => {
		const wrapper = mountFacts({ layout: 'tiles', columns: 3, fields: FIELDS })
		expect(wrapper.find('[data-testid="cn-fact-action"]').classes()).toContain('cn-facts-widget__row--wide')
		expect(wrapper.find('[data-testid="cn-fact-trigger"]').classes()).not.toContain('cn-facts-widget__row--wide')
	})

	it('keeps the wrapping tiles without columns', () => {
		const rows = mountFacts({ layout: 'tiles', fields: FIELDS }).find('.cn-facts-widget__rows')
		expect(rows.classes()).not.toContain('cn-facts-widget__rows--tile-grid')
		expect(rows.classes()).not.toContain('cn-facts-widget__rows--three')
	})
})

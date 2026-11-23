/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `format: "group"` shows a Nextcloud group by its display name, and a
 * list's `itemFormat` writes each item that way (DqZaaktype Gegevens
 * "Behandelende teams": "Vergunningen, Toezicht en handhaving", not the ids).
 */
var mockNames = { vergunningen: 'Vergunningen', 'toezicht-handhaving': 'Toezicht en handhaving' }
var mockLoad = jest.fn(() => Promise.resolve(''))

jest.mock('../../src/utils/groupAutocomplete.js', () => ({
	__esModule: true,
	groupDisplayName: (gid) => mockNames[gid] ?? null,
	loadGroupDisplayName: (...args) => mockLoad(...args),
}))

import { mount } from '@vue/test-utils'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'

const mountFacts = (propsData) => mount(CnFactsWidget, { propsData, stubs: { NcLoadingIcon: true } })

describe('CnFactsWidget: format group', () => {
	it('shows groups by their display name, in a list too', () => {
		const fields = [
			{ path: 'handling.defaultGroup', key: 'lead', label: 'Lead', format: 'group' },
			{ path: 'handling.teams', key: 'teams', label: 'Teams', format: 'list', itemFormat: 'group' },
		]
		const w = mountFacts({ objectData: { handling: { defaultGroup: 'vergunningen', teams: ['vergunningen', 'toezicht-handhaving'] } }, content: { fields } })
		expect(w.find('[data-testid="cn-fact-lead"] dd').text()).toBe('Vergunningen')
		expect(w.find('[data-testid="cn-fact-teams"] dd').text()).toBe('Vergunningen, Toezicht en handhaving')
	})

	it('shows the id while the name is unknown, and asks for it', () => {
		const w = mountFacts({ objectData: { group: 'onbekend' }, content: { fields: [{ path: 'group', key: 'group', label: 'Group', format: 'group' }] } })
		expect(w.find('[data-testid="cn-fact-group"] dd').text()).toBe('onbekend')
		expect(mockLoad).toHaveBeenCalledWith('onbekend')
	})
})

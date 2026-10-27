/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `rows` record list can lead each row with its icon in a round tile
 * (`iconTile`), as DqZaakTaken draws "Wat hierna komt" (r31: the text sat at
 * the card inset with no tile).
 *
 * @spec openspec/changes/record-list-row-icon-tile/specs/record-list/spec.md
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), request: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))

import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const BASE = {
	endpointSource: { url: '/apps/x/api/planned', responsePath: 'results' },
	presentation: 'rows',
	title: '{label}',
	icon: 'CalendarBlankOutline',
}

function mountList(content) {
	return mount(CnRecordListWidget, { props: { content }, global: { mocks: { $router: { push: jest.fn() } } } })
}

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { results: [{ id: 'p-1', label: 'Besluit opstellen' }] } })
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget iconTile', () => {
	it('leads each row with its icon in a tile', async () => {
		const w = mountList({ ...BASE, iconTile: true })
		await flush()
		const tile = w.find('[data-testid="cn-record-list-icon-tile"]')
		expect(tile.exists()).toBe(true)
		expect(w.find('.cn-record-list__row').element.firstElementChild.classList.contains('cn-record-list__icon-tile')).toBe(true)
	})

	it('draws no tile without iconTile, even with an icon', async () => {
		const w = mountList(BASE)
		await flush()
		expect(w.text()).toContain('Besluit opstellen')
		expect(w.find('[data-testid="cn-record-list-icon-tile"]').exists()).toBe(false)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqDagAfsluiten's "Vandaag vastgelegd": a done mark, then the kind pill, the
 * linked title and the meta on one line, and the note under it.
 *
 * @spec openspec/changes/record-list-headline-rows/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

/**
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const ROWS = [
	{ title: 'Verlichting fietspad Lindelaan', kindLabel: 'Zaak', recordedMeta: '2026-0110 · 15:40', note: 'Drie documenten beoordeeld.' },
]
const CONTENT = {
	endpointSource: { url: '/apps/dossiq/api/personal-queue/end-of-day', responsePath: 'recorded' },
	presentation: 'rows',
	icon: 'Check',
	title: '{title}',
	pill: { field: 'kindLabel', variant: 'info' },
	meta: '{recordedMeta}',
	text: '{note}',
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: { recorded: ROWS } })
})

describe('CnRecordListWidget headLine rows', () => {
	it('draws the pill, the title and the meta on one line and the note under it', async () => {
		const w = mount(CnRecordListWidget, { props: { content: { ...CONTENT, headLine: true } } })
		await flush()
		const line = w.find('[data-testid="cn-record-list-headline"]')
		expect(line.exists()).toBe(true)
		const parts = line.element.children
		expect(parts[0].textContent).toContain('Zaak')
		expect(parts[1].textContent.trim()).toBe('Verlichting fietspad Lindelaan')
		expect(parts[1].classList.contains('cn-record-list__title--link')).toBe(true)
		expect(parts[2].textContent.trim()).toBe('2026-0110 · 15:40')
		const note = w.find('[data-testid="cn-record-list-text"]')
		expect(note.classes()).toContain('cn-record-list__note')
		expect(note.text()).toBe('Drie documenten beoordeeld.')
		expect(w.find('.cn-record-list__aside').exists()).toBe(false)
	})

	it('keeps title and meta on their own lines without headLine', async () => {
		const w = mount(CnRecordListWidget, { props: { content: CONTENT } })
		await flush()
		expect(w.find('[data-testid="cn-record-list-headline"]').exists()).toBe(false)
		expect(w.find('.cn-record-list__aside').exists()).toBe(true)
	})

	it('draws the icon tile at the declared size and tone', async () => {
		const w = mount(CnRecordListWidget, { props: { content: { ...CONTENT, headLine: true, iconTile: { size: 24, tone: 'success' } } } })
		await flush()
		const tile = w.find('[data-testid="cn-record-list-icon-tile"]')
		expect(tile.exists()).toBe(true)
		expect(tile.classes()).toContain('cn-record-list__icon-tile--success')
		expect(tile.attributes('style')).toContain('--cn-record-list-icon-tile-size: 24px')
	})

	it('keeps the 36px sunken tile for iconTile true', async () => {
		const w = mount(CnRecordListWidget, { props: { content: { ...CONTENT, iconTile: true } } })
		await flush()
		const tile = w.find('[data-testid="cn-record-list-icon-tile"]')
		expect(tile.exists()).toBe(true)
		expect(tile.attributes('style') || '').not.toContain('--cn-record-list-icon-tile-size')
		expect(tile.classes().some((name) => name.startsWith('cn-record-list__icon-tile--'))).toBe(false)
	})
})

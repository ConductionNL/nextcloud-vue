/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Record-list row options for a case type's statuses (DqZaaktypeOverzicht
 * "Statussen"): a colour dot before the name and flag text at the end
 * ("Start", "Termijn opgeschort", "Eind").
 *
 * @spec openspec/changes/record-list-dot-flags/specs/record-list/spec.md#requirement-a-record-list-row-can-carry-a-colour-dot-and-flag-text
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const STATUSES = [
	{ id: 's1', name: 'Ontvangen', color: '#234a78', isStart: true },
	{ id: 's2', name: 'Aanvullende gegevens gevraagd', color: '#7a4f00', suspends: 'yes' },
	{ id: 's3', name: 'In behandeling', color: 'red;background:url(x)' },
	{ id: 's4', name: 'Verleend', color: 'var(--color-success)', isEnd: true },
	{ id: 's5', name: 'Geweigerd', tone: 'error', isEnd: true },
]

const CONTENT = {
	register: 'dossiq',
	schema: 'statusType',
	title: '{name}',
	dot: 'color',
	flags: [
		{ field: 'isStart', label: 'Start' },
		{ field: 'suspends', value: 'yes', label: 'Term suspended' },
		{ field: 'isEnd', label: 'End' },
	],
}

/**
 * Mount the list.
 *
 * @param {object} content The content.
 * @param {object} [provide] Values to provide.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The list.
 */
async function mountList(content, provide = {}) {
	axios.get.mockResolvedValue({ data: { results: STATUSES, total: 5 } })
	const w = mount(CnRecordListWidget, {
		props: { content },
		global: { provide, stubs: { NcLoadingIcon: true, CnIcon: true } },
	})
	await flushPromises()
	return w
}

describe('CnRecordListWidget dot and flags', () => {
	it('draws a colour dot from the field, and none for an unsafe or missing value', async () => {
		const rows = (await mountList(CONTENT)).findAll('[data-testid="cn-record-list-item"]')
		expect(rows[0].find('[data-testid="cn-record-list-dot"]').attributes('style')).toMatch(/background: (#234a78|rgb\(35, 74, 120\))/)
		expect(rows[2].find('[data-testid="cn-record-list-dot"]').exists()).toBe(false)
		expect(rows[3].find('[data-testid="cn-record-list-dot"]').attributes('style')).toContain('var(--color-success)')
		expect(rows[4].find('[data-testid="cn-record-list-dot"]').exists()).toBe(false)
	})

	it('maps a value to a colour through colorMap', async () => {
		const rows = (await mountList({ ...CONTENT, dot: { field: 'tone', colorMap: { error: 'var(--color-error)' } } })).findAll('[data-testid="cn-record-list-item"]')
		expect(rows[4].find('[data-testid="cn-record-list-dot"]').attributes('style')).toContain('var(--color-error)')
	})

	it('draws the flags a row has, through the host translate', async () => {
		const nl = { Start: 'Start', 'Term suspended': 'Termijn opgeschort', End: 'Eind' }
		const rows = (await mountList(CONTENT, { cnTranslate: (key) => nl[key] ?? key })).findAll('[data-testid="cn-record-list-item"]')
		const flag = (row) => (row.find('[data-testid="cn-record-list-flag"]').exists() ? row.find('[data-testid="cn-record-list-flag"]').text() : '')
		expect(rows.map(flag)).toEqual(['Start', 'Termijn opgeschort', '', 'Eind', 'Eind'])
	})

	it('draws neither without the keys', async () => {
		const w = await mountList({ register: 'dossiq', schema: 'statusType', title: '{name}' })
		expect(w.find('[data-testid="cn-record-list-dot"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-record-list-flag"]').exists()).toBe(false)
	})
})

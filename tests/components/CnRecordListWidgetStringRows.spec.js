/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list draws rows that are plain strings (record-list-string-rows).
 * Board DqZaaktypeOverzicht's Controle card reads an endpoint that answers
 * `{ warnings: string[] }` and draws them as sentences in one warning box.
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const WARNINGS = ['Field Welstandsgebied has no English name.', 'Rule 3 names a message without English text.']

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget string rows', () => {
	it('shows each string row as its title when no title template is set', async () => {
		axios.get.mockResolvedValue({ data: { warnings: WARNINGS } })
		const w = mount(CnRecordListWidget, {
			props: { content: { endpointSource: { url: '/apps/dossiq/api/case-types/1/publish/validate', responsePath: 'warnings' }, presentation: 'inline' } },
		})
		await flush()
		expect(w.findAll('.cn-record-list__inline-title').map((i) => i.text())).toEqual(WARNINGS)
	})

	it('reaches a string row as {value} in a template', async () => {
		axios.get.mockResolvedValue({ data: ['a', 'b'] })
		const w = mount(CnRecordListWidget, {
			props: { content: { endpointSource: { url: '/apps/x/api/list' }, presentation: 'inline', title: 'Item {value}' } },
		})
		await flush()
		expect(w.findAll('.cn-record-list__inline-title').map((i) => i.text())).toEqual(['Item a', 'Item b'])
	})

	it('draws a notice list as one toned box with a lead and the rows as sentences', async () => {
		axios.get.mockResolvedValue({ data: { warnings: WARNINGS } })
		const w = mount(CnRecordListWidget, {
			props: { content: { endpointSource: { url: '/apps/dossiq/api/case-types/1/publish/validate', responsePath: 'warnings' }, presentation: 'notice', variant: 'warning', lead: '{total} warnings:' } },
		})
		await flush()
		const box = w.find('[data-testid="cn-record-list-notice"]')
		expect(box.exists()).toBe(true)
		expect(box.classes()).toContain('cn-record-list__notice--warning')
		expect(box.attributes('role')).toBe('note')
		expect(box.text()).toBe(`2 warnings: ${WARNINGS.join(' ')}`)
		expect(w.find('.cn-record-list__list').exists()).toBe(false)
	})

	it('shows the empty text for a notice list with no rows, and falls back to info for an unknown variant', async () => {
		axios.get.mockResolvedValueOnce({ data: { warnings: [] } })
		const empty = mount(CnRecordListWidget, {
			props: { content: { endpointSource: { url: '/apps/dossiq/api/a', responsePath: 'warnings' }, presentation: 'notice', emptyText: 'No warnings' } },
		})
		await flush()
		expect(empty.find('[data-testid="cn-record-list-empty"]').text()).toBe('No warnings')

		axios.get.mockResolvedValueOnce({ data: ['x'] })
		const odd = mount(CnRecordListWidget, {
			props: { content: { endpointSource: { url: '/apps/dossiq/api/b' }, presentation: 'notice', variant: 'shout' } },
		})
		await flush()
		expect(odd.find('[data-testid="cn-record-list-notice"]').classes()).toContain('cn-record-list__notice--info')
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaaktype "Berichten aan de aanvrager": a record-list table drawn as the
 * board's data table (tableLook "data"), with its footnote as an info notice
 * (footnoteVariant).
 *
 * @spec openspec/changes/record-list-data-table-and-notice-footnote/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

/** Let fetches settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

/**
 * Mount a messages table.
 *
 * @param {object} extra Extra content.
 * @return {import('@vue/test-utils').VueWrapper} The list.
 */
function mountList(extra = {}) {
	return mount(CnRecordListWidget, {
		props: {
			content: {
				register: 'r',
				schema: 'emailTemplate',
				presentation: 'table',
				columns: [{ label: 'Moment', value: '{moment}' }, { label: 'Message', value: '{name}' }],
				footnote: 'Every e-mail carries an unsubscribe link.',
				...extra,
			},
		},
		global: { stubs: { CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' }, NcLoadingIcon: true } },
	})
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: [{ id: 't1', moment: 'Case received', name: 'Receipt' }], total: 1 } })
})

describe('CnRecordListWidget tableLook and footnoteVariant', () => {
	it('marks a data table so the board look can draw it', async () => {
		const w = mountList({ tableLook: 'data' })
		await flush()
		expect(w.find('[data-testid="cn-record-list"]').classes()).toContain('cn-record-list--data-table')
	})

	it('keeps the compact grid without tableLook', async () => {
		const w = mountList()
		await flush()
		expect(w.find('[data-testid="cn-record-list"]').classes()).not.toContain('cn-record-list--data-table')
	})

	it('draws the footnote as a toned notice with its icon', async () => {
		const w = mountList({ footnoteVariant: 'info' })
		await flush()
		const note = w.find('[data-testid="cn-record-list-footnote"]')
		expect(note.classes()).toEqual(expect.arrayContaining(['cn-record-list__notice', 'cn-record-list__notice--info']))
		expect(note.find('.icon').attributes('data-name')).toBe('InformationOutline')
		expect(note.text()).toBe('Every e-mail carries an unsubscribe link.')
	})

	it('keeps a plain footnote without a variant', async () => {
		const w = mountList()
		await flush()
		const note = w.find('[data-testid="cn-record-list-footnote"]')
		expect(note.classes()).toContain('cn-record-list__footnote')
		expect(note.classes()).not.toContain('cn-record-list__notice')
	})
})

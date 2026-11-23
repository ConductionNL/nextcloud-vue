/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record-list meta line built from parts (screens-record-list-meta-parts).
 *
 * @spec openspec/changes/screens-record-list-meta-parts/specs/record-list-meta-parts/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

const ROWS = [
	{ id: 'c-1', title: 'A', identifier: '2026-0082', caseTypeName: 'Woo-verzoek', handler: 'Sanne' },
	{ id: 'c-2', title: 'B', identifier: '2025-0412', caseTypeName: 'Melding', handler: '' },
	{ id: 'c-3', title: 'C' },
]

async function metas(meta, translate) {
	axios.get.mockResolvedValue({ data: { results: ROWS, total: 3 } })
	const wrapper = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'case', title: '{title}', meta } },
		global: { provide: translate ? { cnTranslate: translate } : {}, stubs: { NcLoadingIcon: true } },
	})
	await flushPromises()
	await flushPromises()
	return wrapper.findAll('[data-testid="cn-record-list-item"]').map((item) => {
		const line = item.find('.cn-record-list__meta')
		return line.exists() ? line.text() : null
	})
}

describe('CnRecordListWidget meta parts', () => {
	beforeEach(() => axios.get.mockReset())

	it('drops the empty parts and joins the rest', async () => {
		expect(await metas({ parts: ['{identifier}', '{caseTypeName}', '{handler}'] }))
			.toEqual(['2026-0082 · Woo-verzoek · Sanne', '2025-0412 · Melding', null])
	})

	it('takes a separator, and text and translation inside a part', async () => {
		const translate = (key) => (key === 'By {handler}' ? 'Door {handler}' : key)
		expect(await metas({ parts: ['{identifier}', 'By {handler}'], separator: ' | ' }, translate))
			.toEqual(['2026-0082 | Door Sanne', '2025-0412', null])
	})

	it('keeps a string meta as one template that an empty token empties', async () => {
		expect(await metas('{identifier} · {handler}')).toEqual(['2026-0082 · Sanne', null, null])
	})
})

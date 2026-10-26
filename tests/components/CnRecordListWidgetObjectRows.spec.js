/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list over rows the page record holds (`objectRows`), with no request.
 *
 * @spec openspec/changes/record-list-object-rows/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const STEPS = [
	{ kind: 'gesprek', date: '2026-10-08', summary: 'Gesprek met de ouders' },
	{ kind: 'informatie-opgevraagd', date: '2026-10-10', summary: 'Informatie opgevraagd bij school' },
]

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountList(objectData) {
	return mount(CnRecordListWidget, {
		props: {
			objectData,
			content: {
				objectRows: { path: 'sensitiveProperties', where: { name: 'onderzoeksstappen' }, valuePath: 'value' },
				title: '{summary}',
				meta: '{date}',
				headerCount: true,
				emptyText: 'No steps recorded',
			},
		},
	})
}

beforeEach(() => {
	axios.get.mockReset()
})

describe('CnRecordListWidget objectRows', () => {
	it('lists the rows the record holds, without a request, and counts them in the header', async () => {
		const w = mountList({ id: 'c1', sensitiveProperties: [{ name: 'onderzoeksstappen', value: JSON.stringify(STEPS) }] })
		await flush()
		expect(w.findAll('.cn-record-list__title').map((t) => t.text())).toEqual(['Gesprek met de ouders', 'Informatie opgevraagd bij school'])
		expect(axios.get).not.toHaveBeenCalled()
		const headers = w.emitted('header')
		expect(headers[headers.length - 1][0].count).toBe(2)
	})

	it('shows the empty text when the record came without them', async () => {
		const w = mountList({ id: 'c1' })
		await flush()
		expect(w.find('[data-testid="cn-record-list-empty"]').text()).toBe('No steps recorded')
	})

	it('follows the record when it changes', async () => {
		const w = mountList({ id: 'c1' })
		await flush()
		await w.setProps({ objectData: { id: 'c1', sensitiveProperties: [{ name: 'onderzoeksstappen', value: JSON.stringify(STEPS.slice(0, 1)) }] } })
		await flush()
		expect(w.findAll('.cn-record-list__title')).toHaveLength(1)
	})
})

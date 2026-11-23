import axios from '@nextcloud/axios'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordListWidget `offset`: a card can skip the first rows of its list, so
 * two cards over one list read "next" and "after that" (decidiq DcMijnActies:
 * Volgende vergadering, then Daarna) without showing a row twice.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

/** Let the fetch settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

/**
 * @param {object} content The card content.
 * @return {object} The wrapper.
 */
function mountList(content) {
	return mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'meeting', ...content } },
		global: {
			stubs: { RouterLink: true, CnIcon: true, NcLoadingIcon: true },
			mocks: { $router: { push: jest.fn(), resolve: () => ({ href: '#' }) } },
		},
	})
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: [{ id: 'm-2', title: 'Commissie' }], total: 3 } })
})

describe('CnRecordListWidget offset', () => {
	it('asks the list to skip the first rows', async () => {
		mountList({ sort: { field: 'scheduledDate', dir: 'asc' }, limit: 2, offset: 1 })
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/objects/r/meeting', {
			params: { _limit: 2, _offset: 1, '_order[scheduledDate]': 'asc' },
		})
	})

	it('sends no offset when none or zero is set', async () => {
		mountList({ limit: 2, offset: 0 })
		await flush()
		expect(axios.get.mock.calls[0][1].params).not.toHaveProperty('_offset')
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row's one action can call an app endpoint for that row (DqZaakBesluiten
 * Adviezen: "Herinneren" on an open advice request only).
 *
 * @spec openspec/changes/record-list-row-action-endpoint/specs/record-list/spec.md#requirement-a-rows-one-action-can-call-an-app-endpoint-for-that-row
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const ITEMS = [
	{ id: 'adv-1', subject: 'Advies verlichting', status: 'requested' },
	{ id: 'adv-2', subject: 'Juridische toets', status: 'received' },
]

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const ROW_ACTION = {
	label: 'Remind',
	endpoint: '/apps/dossiq/api/advice/{id}/remind',
	labels: { field: 'status', map: { received: '' } },
	errorText: 'The reminder could not be sent',
}

function mountList() {
	return mount(CnRecordListWidget, {
		props: { content: { register: 'dossiq', schema: 'adviesAanvraag', title: '{subject}', rowAction: ROW_ACTION }, objectId: 'z-1', objectData: { id: 'z-1' } },
		global: { stubs: { CnIcon: true, NcLoadingIcon: true } },
	})
}

beforeEach(() => {
	axios.get.mockReset()
	axios.request.mockReset()
	axios.get.mockResolvedValue({ data: { results: ITEMS, total: 2 } })
})

describe('rowAction with an endpoint', () => {
	it('is a button on the open request only, posts to its URL and reads the list again', async () => {
		const w = mountList()
		await flush()
		const actions = w.findAll('[data-testid="cn-record-list-action"]')
		expect(actions.map((a) => a.text())).toEqual(['Remind'])
		expect(actions[0].element.tagName).toBe('BUTTON')
		axios.request.mockResolvedValue({ data: { status: 'reminded' } })
		const reads = axios.get.mock.calls.length
		await actions[0].trigger('click')
		await flush()
		expect(axios.request).toHaveBeenCalledWith({ method: 'post', url: '/apps/dossiq/api/advice/adv-1/remind' })
		expect(axios.get.mock.calls.length).toBeGreaterThan(reads)
	})

	it('shows the refusal in the server\'s words', async () => {
		const w = mountList()
		await flush()
		axios.request.mockRejectedValue({ response: { data: { error: 'Only the handler may remind' } } })
		await w.find('[data-testid="cn-record-list-action"]').trigger('click')
		await flush()
		expect(w.text()).toContain('Only the handler may remind')
	})
})

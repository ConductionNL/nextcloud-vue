/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record-list footnote that reads its own source: DqTenant's "Historie"
 * card lists audit events and ends with the subscription's reference.
 *
 * @spec openspec/changes/record-list-footnote-own-source/specs/record-list/spec.md#requirement-a-record-list-footnote-can-read-its-own-source
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))

import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

/** Let the requests settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const CONTENT = {
	endpointSource: { url: '/apps/openregister/api/audit-trails', params: { object_uuid: '@objectId' }, responsePath: 'results' },
	presentation: 'rows',
	title: '{action}',
	footnote: {
		text: 'Reference {value}',
		source: { url: '/apps/openregister/api/objects/dossiq/tenantSubscription', params: { tenantRef: '@objectId' }, responsePath: 'results.0.reference' },
	},
}

/**
 * Mount the list on organisation org-1 with the two answers.
 *
 * @param {Array} events The audit rows.
 * @param {Array} subscriptions The subscription records.
 * @return {object} The wrapper.
 */
function mountList(events, subscriptions) {
	mockGet.mockImplementation((url) => Promise.resolve({
		data: { results: String(url).includes('tenantSubscription') ? subscriptions : events },
	}))
	const context = ref({ objectId: 'org-1', object: { id: 'org-1' } })
	return mount(CnRecordListWidget, {
		props: { content: CONTENT, objectId: 'org-1', objectData: { id: 'org-1' } },
		global: { provide: { cnObjectContext: context, cnTranslate: (s) => s } },
	})
}

beforeEach(() => {
	mockGet.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget footnote with its own source', () => {
	it('ends the list with the value read from its own request', async () => {
		const w = mountList([{ id: 1, action: 'create' }], [{ reference: 'TEN-0014' }])
		await flush()

		expect(w.find('[data-testid="cn-record-list-footnote"]').text()).toBe('Reference TEN-0014')
		expect(mockGet.mock.calls.some(([url, config]) => String(url).includes('tenantSubscription') && config?.params?.tenantRef === 'org-1')).toBe(true)
	})

	it('shows with no rows too', async () => {
		const w = mountList([], [{ reference: 'TEN-0014' }])
		await flush()

		expect(w.find('[data-testid="cn-record-list-footnote"]').text()).toBe('Reference TEN-0014')
	})

	it('leaves the footnote out without a value', async () => {
		const w = mountList([{ id: 1, action: 'create' }], [])
		await flush()

		expect(w.find('[data-testid="cn-record-list-footnote"]').exists()).toBe(false)
	})
})

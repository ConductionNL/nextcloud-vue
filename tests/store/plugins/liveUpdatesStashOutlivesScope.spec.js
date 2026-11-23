/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The live refetch repeats a list's own query after the component that first
 * created the store is gone.
 *
 * @spec openspec/changes/live-refetch-keeps-list-params/specs/live-refetch-keeps-list-params/spec.md#requirement-a-live-refetch-repeats-the-lists-last-query
 */

import { createPinia, setActivePinia } from 'pinia'
import { effectScope } from 'vue'
import { createCrudStore } from '../../../src/store/createCrudStore.js'
import { liveUpdatesPlugin } from '../../../src/store/plugins/liveUpdates.js'
import { logsPlugin } from '../../../src/store/plugins/logs.js'
import { createObjectStore } from '../../../src/store/useObjectStore.js'

jest.mock('@nextcloud/notify_push', () => ({
	__esModule: true,
	listen: jest.fn(() => true),
}))

function okJson(data) {
	return { ok: true, json: () => Promise.resolve(data) }
}

describe('liveUpdatesPlugin last-params stash', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		global.fetch = jest.fn(() => Promise.resolve(okJson({ results: [], total: 0 })))
	})

	it('keeps recording fetch params after the scope that first used the store is disposed', async () => {
		const useStore = createObjectStore('live-stash-scope', { plugins: [liveUpdatesPlugin()] })
		const scope = effectScope()
		const store = scope.run(() => useStore())
		store.registerObjectType('case', 'schema-uuid', 'register-uuid')
		scope.stop()

		const params = { _limit: 20, _page: 1, isDraft: false }
		await store.fetchCollection('case', params)

		expect(store.__lastCollectionParams.get('case')).toEqual(params)
	})

	it('keeps the logs auto-refresh after the scope that first used the store is disposed', async () => {
		const useStore = createCrudStore('logs-scope', {
			endpoint: 'sources',
			plugins: [logsPlugin({ parentIdParam: 'source_id', autoRefreshOnItemChange: true })],
		})
		const scope = effectScope()
		const store = scope.run(() => useStore())
		scope.stop()

		store.setItem({ id: 7 })
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(global.fetch.mock.calls.some(([url]) => String(url).includes('source_id=7'))).toBe(true)
	})
})

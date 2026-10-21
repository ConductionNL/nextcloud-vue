/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The state of OpenRegister's search indexes, read live and never copied.
 *
 * @spec openspec/changes/search-index-status/specs/search-index-status/spec.md
 */
var mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))

import { flushPromises, mount } from '@vue/test-utils'
import CnSearchIndexStatus from '../../src/components/CnSearchIndexStatus/CnSearchIndexStatus.vue'
import { lastRunTime } from '../../src/components/CnSearchIndexStatus/searchIndexStatus.js'

/**
 * @param {object} data The answer.
 * @return {Promise<object>} The mounted panel.
 */
async function mountWith(data) {
	mockGet.mockResolvedValue({ data })
	const w = mount(CnSearchIndexStatus)
	await flushPromises()
	return w
}

const text = (w, id) => w.find(`[data-testid="cn-search-index-${id}"]`).text()

describe('CnSearchIndexStatus', () => {
	it('shows the figures OpenRegister answered with', async () => {
		const w = await mountWith({ tableCount: 12, indexCount: 30, concurrentRebuildSupported: true, lastRun: [] })
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/settings/search-index')
		expect(text(w, 'tables')).toBe('12')
		expect(text(w, 'indexes')).toBe('30')
		expect(text(w, 'concurrent')).toBe('Yes')
		expect(text(w, 'last-run')).toBe('Never')
		expect(text(w, 'commands')).toContain('occ openregister:tables:search-index')
	})

	it('says a rebuild locks the table when the platform cannot rebuild concurrently', async () => {
		const w = await mountWith({ tableCount: 1, indexCount: 1, concurrentRebuildSupported: false })
		expect(text(w, 'concurrent')).toBe('No, a rebuild locks the table it is on')
	})

	it('draws the failure rather than a table of zeroes', async () => {
		const w = await mountWith({ error: 'Search index unavailable' })
		expect(text(w, 'error')).toBe('Search index unavailable')
		expect(w.find('[data-testid="cn-search-index-tables"]').exists()).toBe(false)
	})

	it('reads a run report as its finish time, else its start time, and no run as null', () => {
		expect(lastRunTime([])).toBeNull()
		expect(lastRunTime({ startedAt: '2026-10-01T10:00:00Z', finishedAt: '2026-10-01T10:05:00Z' })).toBe('2026-10-01T10:05:00Z')
		expect(lastRunTime({ startedAt: '2026-10-01T10:00:00Z' })).toBe('2026-10-01T10:00:00Z')
		expect(lastRunTime('')).toBeNull()
	})
})

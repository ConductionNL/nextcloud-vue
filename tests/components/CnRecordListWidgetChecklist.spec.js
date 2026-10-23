/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTenant's Inrichten card: a bar of how far the set-up is, then the steps
 * as a checklist in three columns, a done step ticked, an open one an empty
 * circle; the header reads "5 van 7 stappen klaar". `presentation:
 * "checklist"` draws the rows that way, `done` says when a row is done and
 * `progress: true` draws the bar.
 *
 * @spec openspec/changes/record-list-checklist/specs/record-list/spec.md#requirement-a-record-list-can-draw-its-rows-as-a-checklist
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

/**
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const STEPS = [
	{ step: 'contract', status: 'completed' },
	{ step: 'first_user', status: 'completed' },
	{ step: 'sso_setup', status: 'pending' },
]
const CONTENT = {
	endpointSource: { url: '/apps/dossiq/api/saas/tenants/t-1/onboarding/progress', responsePath: 'progress.steps' },
	presentation: 'checklist',
	title: '{step}',
	done: { field: 'status', op: 'eq', value: 'completed' },
	progress: true,
	columns: 3,
	headerNote: '{count:status=completed} of {total} steps done',
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: { progress: { steps: STEPS } } })
})

describe('CnRecordListWidget checklist', () => {
	it('ticks the done steps and leaves the open ones open, in the declared columns', async () => {
		const w = mount(CnRecordListWidget, { props: { content: CONTENT } })
		await flush()
		const list = w.find('[data-testid="cn-record-list-checklist"]')
		expect(list.attributes('style')).toContain('--cn-record-list-columns: 3')
		const items = w.findAll('[data-testid="cn-record-list-check"]')
		expect(items.map((item) => item.find('.cn-record-list__check-title').text())).toEqual(['contract', 'first_user', 'sso_setup'])
		expect(items.map((item) => item.classes().includes('cn-record-list__check--done'))).toEqual([true, true, false])
	})

	it('draws a bar of the done share', async () => {
		const w = mount(CnRecordListWidget, { props: { content: CONTENT } })
		await flush()
		const bar = w.find('[data-testid="cn-record-list-checklist-bar"]')
		expect(bar.attributes('aria-valuenow')).toBe('2')
		expect(bar.attributes('aria-valuemax')).toBe('3')
		expect(w.find('.cn-record-list__checklist-fill').attributes('style')).toContain('width: 67%')
	})

	it('reports the done count in its header note', async () => {
		const w = mount(CnRecordListWidget, { props: { content: CONTENT } })
		await flush()
		const headers = w.emitted('header')
		expect(headers[headers.length - 1][0].note).toBe('2 of 3 steps done')
	})

	it('draws no bar without progress', async () => {
		const w = mount(CnRecordListWidget, { props: { content: { ...CONTENT, progress: false } } })
		await flush()
		expect(w.find('[data-testid="cn-record-list-checklist-bar"]').exists()).toBe(false)
	})
})

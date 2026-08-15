/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnStatWidget's aggregate-source filter consuming `@workspace.*`
 * tokens — the bridge that lets the dashboard date-range pills (which publish
 * `dateFrom` / `dateTo` into the page workspace context) re-scope a KPI tile's
 * count. Optional `@workspace.<key>?` tokens that stay unresolved (an "All"
 * range with empty bounds) are dropped so the date filter is omitted entirely.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
}

function mountWidget(content, workspace) {
	return mount(CnStatWidget, {
		propsData: { content },
		stubs,
		provide: { cnWorkspaceContext: workspace !== undefined ? workspace : {} },
	})
}

const dateFilterSource = {
	register: 'decidesk',
	schema: 'decision',
	metric: 'count',
	filter: {
		decisionDate: { '>=': '@workspace.dateFrom?', '<=': '@workspace.dateTo?' },
	},
}

describe('CnStatWidget — @workspace date-window filter', () => {
	beforeEach(() => {
		axios.get.mockReset()
		generateUrl.mockClear()
		axios.get.mockResolvedValue({ data: { value: 5 } })
	})

	it('resolves @workspace.dateFrom?/dateTo? into operator filter params when the window is set', async () => {
		const wrapper = mountWidget({ source: dateFilterSource }, {
			dateFrom: '2026-01-01T00:00:00.000Z',
			dateTo: '2026-01-31T23:59:59.999Z',
		})
		await flush()
		await wrapper.vm.$nextTick()

		const params = axios.get.mock.calls[0][1].params
		expect(params['filter[decisionDate][>=]']).toBe('2026-01-01T00:00:00.000Z')
		expect(params['filter[decisionDate][<=]']).toBe('2026-01-31T23:59:59.999Z')
		expect(wrapper.vm.value).toBe(5)
	})

	it('drops the date filter entirely when the window is empty ("All")', async () => {
		const wrapper = mountWidget({ source: dateFilterSource }, { dateFrom: '', dateTo: '' })
		await flush()
		await wrapper.vm.$nextTick()

		const params = axios.get.mock.calls[0][1].params
		expect(params['filter[decisionDate][>=]']).toBeUndefined()
		expect(params['filter[decisionDate][<=]']).toBeUndefined()
		expect(params.metric).toBe('count')
	})

	it('drops the date filter when no workspace context is provided at all', async () => {
		const wrapper = mountWidget({ source: dateFilterSource })
		await flush()
		await wrapper.vm.$nextTick()

		const params = axios.get.mock.calls[0][1].params
		expect(params['filter[decisionDate][>=]']).toBeUndefined()
		expect(params['filter[decisionDate][<=]']).toBeUndefined()
	})

	it('refetches with the new window when the workspace context changes', async () => {
		const workspace = ref({ dateFrom: '', dateTo: '' })
		const wrapper = mountWidget({ source: dateFilterSource }, workspace)
		await flush()
		await wrapper.vm.$nextTick()
		expect(axios.get.mock.calls[0][1].params['filter[decisionDate][>=]']).toBeUndefined()

		workspace.value = { dateFrom: '2026-06-01T00:00:00.000Z', dateTo: '2026-06-30T23:59:59.999Z' }
		await wrapper.vm.$nextTick()
		await flush()
		const lastParams = axios.get.mock.calls[axios.get.mock.calls.length - 1][1].params
		expect(lastParams['filter[decisionDate][>=]']).toBe('2026-06-01T00:00:00.000Z')
	})
})

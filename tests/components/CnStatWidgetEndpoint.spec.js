/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnStatWidget's `source: { kind: 'endpoint' }` — reading a single
 * value from an arbitrary app REST endpoint at a JSON dot-path, with
 * `@page.<param>` / `@workspace.<param>` URL/param interpolation from the
 * page-level workspace context (the dashboard period selector, etc.).
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

function mountWidget(content, { workspace } = {}) {
	return mount(CnStatWidget, {
		propsData: { content },
		stubs,
		provide: {
			cnWorkspaceContext: workspace !== undefined ? workspace : {},
		},
	})
}

describe('CnStatWidget — endpoint source', () => {
	beforeEach(() => {
		axios.get.mockReset()
		generateUrl.mockClear()
	})

	it('reads the value at the dot-path of the response and routes app-relative URLs through generateUrl', async () => {
		axios.get.mockResolvedValue({ data: { totalLeads: 42, other: 1 } })
		const wrapper = mountWidget({
			label: 'Leads',
			source: { kind: 'endpoint', url: '/api/analytics/summary', path: 'totalLeads' },
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(generateUrl).toHaveBeenCalledWith('/api/analytics/summary')
		expect(axios.get).toHaveBeenCalledWith('/nc/api/analytics/summary', { params: {} })
		expect(wrapper.vm.value).toBe(42)
		expect(wrapper.text()).toContain('42')
	})

	it('interpolates @page.<param> tokens in the URL from the workspace context', async () => {
		axios.get.mockResolvedValue({ data: { count: 7 } })
		const wrapper = mountWidget(
			{ source: { kind: 'endpoint', url: '/api/stats/@page.period', path: 'count' } },
			{ workspace: { period: 'last-30-days' } },
		)
		await flush()
		await wrapper.vm.$nextTick()

		expect(generateUrl).toHaveBeenCalledWith('/api/stats/last-30-days')
		expect(wrapper.vm.value).toBe(7)
	})

	it('interpolates string params and passes them through', async () => {
		axios.get.mockResolvedValue({ data: { value: 3 } })
		const wrapper = mountWidget(
			{ source: { kind: 'endpoint', url: '/api/x', path: 'value', params: { period: '@workspace.period', fixed: 'a' } } },
			{ workspace: { period: 'q1' } },
		)
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledWith('/nc/api/x', { params: { period: 'q1', fixed: 'a' } })
	})

	it('leaves absolute URLs untouched (no generateUrl)', async () => {
		axios.get.mockResolvedValue({ data: { n: 9 } })
		const wrapper = mountWidget({
			source: { kind: 'endpoint', url: 'https://example.com/api', path: 'n' },
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(generateUrl).not.toHaveBeenCalled()
		expect(axios.get).toHaveBeenCalledWith('https://example.com/api', { params: {} })
		expect(wrapper.vm.value).toBe(9)
	})

	it('returns the whole body when no path is given', async () => {
		axios.get.mockResolvedValue({ data: 15 })
		const wrapper = mountWidget({ source: { kind: 'endpoint', url: '/api/n' } })
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.value).toBe(15)
	})

	it('resolves to null when the path is missing in the response', async () => {
		axios.get.mockResolvedValue({ data: { something: 1 } })
		const wrapper = mountWidget({ source: { kind: 'endpoint', url: '/api/n', path: 'nope.deep' } })
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.value).toBeNull()
	})

	it('does not fetch when an endpoint source has no url', async () => {
		const wrapper = mountWidget({ source: { kind: 'endpoint', path: 'x' } })
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(wrapper.vm.value).toBeNull()
	})

	it('refetches when the workspace context changes (reactive period selector)', async () => {
		axios.get.mockResolvedValue({ data: { count: 1 } })
		// CnDashboardPage provides `cnWorkspaceContext` as a reactive ref —
		// mirror that so a period change re-resolves the endpoint URL.
		const workspace = ref({ period: 'a' })
		const wrapper = mountWidget(
			{ source: { kind: 'endpoint', url: '/api/s/@page.period', path: 'count' } },
			{ workspace },
		)
		await flush()
		await wrapper.vm.$nextTick()
		expect(generateUrl).toHaveBeenLastCalledWith('/api/s/a')

		// Simulate the page writing a new period into the provided context.
		workspace.value = { period: 'b' }
		await wrapper.vm.$nextTick()
		await flush()
		expect(generateUrl).toHaveBeenLastCalledWith('/api/s/b')
	})
})

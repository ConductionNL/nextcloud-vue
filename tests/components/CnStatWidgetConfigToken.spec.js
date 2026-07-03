/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnStatWidget's `@config.<key>` token support — the page-level app
 * config (provided on `cnAppConfig`, e.g. the reporting currency a setup wizard
 * captures) resolves into the `format.currency` so the value formats with the
 * configured currency, into a filter token, and into an endpoint URL/param.
 * Falls back to the literal default (EUR) when the config key is unset.
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

import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
}

function mountWidget(content, { config, workspace } = {}) {
	return mount(CnStatWidget, {
		propsData: { content },
		stubs,
		provide: {
			cnAppConfig: config !== undefined ? config : {},
			cnWorkspaceContext: workspace !== undefined ? workspace : {},
		},
	})
}

describe('CnStatWidget — @config.<key> token', () => {
	beforeEach(() => {
		axios.get.mockReset()
		generateUrl.mockClear()
	})

	it('formats currency using the configured @config.currency', async () => {
		axios.get.mockResolvedValue({ data: { results: [], total: 1500 } })
		const wrapper = mountWidget(
			{
				source: { kind: 'endpoint', url: '/api/revenue', path: 'total' },
				format: { style: 'currency', currency: '@config.currency', decimals: 0 },
			},
			{ config: { currency: 'USD' } },
		)
		await flush()
		await wrapper.vm.$nextTick()

		// The displayed value formats as USD (Intl uses "$" for USD) — the
		// @config.currency token is resolved, not rendered raw.
		expect(wrapper.text()).toContain('$')
		expect(wrapper.text()).not.toContain('@config')
		wrapper.destroy()
	})

	it('falls back to the literal EUR default when @config.currency is unset', async () => {
		axios.get.mockResolvedValue({ data: { total: 1000 } })
		const wrapper = mountWidget(
			{
				source: { kind: 'endpoint', url: '/api/revenue', path: 'total' },
				format: { style: 'currency', currency: '@config.currency', decimals: 0 },
			},
			{ config: {} },
		)
		await flush()
		await wrapper.vm.$nextTick()

		// Unresolved → the guard applies the EUR default (no raw token, no RangeError).
		expect(wrapper.text()).toContain('€')
		expect(wrapper.text()).not.toContain('@config')
		wrapper.destroy()
	})

	it('keeps a literal currency string working (backwards compatible)', async () => {
		axios.get.mockResolvedValue({ data: { total: 50 } })
		const wrapper = mountWidget(
			{
				source: { kind: 'endpoint', url: '/api/revenue', path: 'total' },
				format: { style: 'currency', currency: 'GBP', decimals: 0 },
			},
			{ config: { currency: 'USD' } },
		)
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('£')
		wrapper.destroy()
	})

	it('interpolates @config.<key> in an endpoint URL', async () => {
		axios.get.mockResolvedValue({ data: { count: 9 } })
		const wrapper = mountWidget(
			{ source: { kind: 'endpoint', url: '/api/stats/@config.fiscalYear', path: 'count' } },
			{ config: { fiscalYear: '2026' } },
		)
		await flush()
		await wrapper.vm.$nextTick()
		expect(generateUrl).toHaveBeenCalledWith('/api/stats/2026')
		expect(wrapper.vm.value).toBe(9)
		wrapper.destroy()
	})

	it('resolves @config.<key> in an aggregate filter', async () => {
		axios.get.mockResolvedValue({ data: { total: 3 } })
		const wrapper = mountWidget(
			{
				source: {
					kind: 'count',
					register: 'invoices',
					schema: 'invoice',
					metric: 'count',
					filter: { currency: '@config.currency' },
				},
			},
			{ config: { currency: 'USD' } },
		)
		await flush()
		await wrapper.vm.$nextTick()
		// The flattened filter param must carry the resolved config value.
		const call = axios.get.mock.calls[0]
		expect(call[1].params['filter[currency]']).toBe('USD')
		wrapper.destroy()
	})
})

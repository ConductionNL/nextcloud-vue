/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A `responsePath` with a workspace token (DqProcesanalyse: the page's
 * "Gemiddeld | Mediaan" switch picks `phaseDays.mean` or `phaseDays.median`
 * out of one response).
 *
 * @spec openspec/changes/dashboard-board-termijnen/specs/dashboard-page/spec.md#requirement-a-page-filter-as-a-segmented-group-on-the-description-line
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

import axios from '@nextcloud/axios'
import { nextTick, reactive } from 'vue'
import {
	fetchEndpointSource,
	invalidateEndpointSourceCache,
	resolveEndpointRequest,
	useEndpointSource,
} from '../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const BODY = { phaseDays: { mean: { rows: ['mean'] }, median: { rows: ['median'] } } }

describe('responsePath tokens', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: BODY })
		invalidateEndpointSourceCache()
	})

	it('resolves a workspace token in the path', () => {
		const req = resolveEndpointRequest({ url: '/api/pm', responsePath: 'phaseDays.@workspace.measure' }, { workspace: { measure: 'median' } })
		expect(req.responsePath).toBe('phaseDays.median')
		expect(req.blocked).toBe(false)
	})

	it('blocks while the token has no value', () => {
		const req = resolveEndpointRequest({ url: '/api/pm', responsePath: 'phaseDays.@workspace.measure' }, { workspace: {} })
		expect(req.blocked).toBe(true)
	})

	it('keeps a plain path as written', () => {
		expect(resolveEndpointRequest({ url: '/api/pm', responsePath: 'phaseDays.mean' }, {}).responsePath).toBe('phaseDays.mean')
	})

	it('plucks the chosen part in a one-shot read', async () => {
		const value = await fetchEndpointSource({ url: '/api/pm', responsePath: 'phaseDays.@workspace.measure' }, { workspace: { measure: 'median' } })
		expect(value).toEqual({ rows: ['median'] })
	})

	it('re-plucks when the workspace value changes, from the one cached response', async () => {
		const workspace = reactive({ measure: 'mean' })
		const { data } = useEndpointSource({ url: '/api/pm', responsePath: 'phaseDays.@workspace.measure' }, { ctx: () => ({ workspace }) })
		await flush()
		expect(data.value).toEqual({ rows: ['mean'] })
		workspace.measure = 'median'
		await nextTick()
		await flush()
		expect(data.value).toEqual({ rows: ['median'] })
		expect(axios.get).toHaveBeenCalledTimes(1)
	})
})

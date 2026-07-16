/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnIntegrationCard — generic 4-surface widget driving
 * every leaf integration that doesn't yet ship a bespoke widget.
 *
 * Per AD-19 surface fallback:
 *   - detail-page    → full list of linked rows
 *   - user-dashboard / app-dashboard → compact list (max 5)
 *   - single-entity  → one row chip resolved via `value`
 *
 * Covers:
 *   - happy paths per surface (list / compact / chip)
 *   - empty path renders the empty-state label
 *   - 503 path renders the unavailable label
 *   - single-entity fetches `/integrations/{id}/{value}` (not the
 *     list endpoint) and renders the entity chip when found
 *   - single-entity empty when `value` is unset
 *   - surface switch refetches with the right shape
 */

jest.mock('../../src/utils/index.js', () => ({
	__esModule: true,
	buildHeaders: jest.fn(() => ({ requesttoken: 'stub-token' })),
}))

import { mount } from '@vue/test-utils'

import CnIntegrationCard from '../../src/components/CnIntegrationCard/CnIntegrationCard.vue'

const flush = () => new Promise((r) => setTimeout(r, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
	LinkVariant: true,
	// CnDetailCard transparently exposes the slot so the assertions can
	// inspect the surface-specific rendering without depending on its
	// own (heavily-styled) internal markup.
	CnDetailCard: {
		name: 'CnDetailCard',
		props: ['title', 'icon', 'collapsible'],
		template: '<section class="cn-detail-card" :data-title="title"><slot /></section>',
	},
}

function makeResponse({ status, body }) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: () => Promise.resolve(body),
	}
}

function mountCard(overrides = {}) {
	return mount(CnIntegrationCard, {
		stubs,
		propsData: {
			integrationId: 'calendar',
			register: 'decidesk',
			schema: 'meeting',
			objectId: 'obj-1',
			surface: 'detail-page',
			apiBase: '/apps/openregister/api',
			...overrides,
		},
	})
}

describe('CnIntegrationCard', () => {
	let fetchMock

	beforeEach(() => {
		fetchMock = jest.fn()
		global.fetch = fetchMock
	})

	afterEach(() => {
		delete global.fetch
	})

	describe('detail-page surface', () => {
		it('renders the full list returned from the list endpoint', async () => {
			fetchMock.mockResolvedValueOnce(makeResponse({
				status: 200,
				body: { results: Array.from({ length: 7 }, (_, i) => ({ id: `r${i}`, title: `Row ${i}` })) },
			}))

			const wrapper = mountCard({ surface: 'detail-page' })
			await flush()

			expect(fetchMock).toHaveBeenCalledWith(
				'/apps/openregister/api/objects/decidesk/meeting/obj-1/integrations/calendar',
				{ headers: { requesttoken: 'stub-token' } },
			)
			expect(wrapper.findAll('.cn-integration-card__row')).toHaveLength(7)
		})

		it('shows the empty state when the list is empty', async () => {
			fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { results: [] } }))
			const wrapper = mountCard({ emptyLabel: 'Nothing linked' })
			await flush()
			expect(wrapper.find('.cn-integration-card__empty').text()).toBe('Nothing linked')
		})

		it('renders the unavailable banner on a 503', async () => {
			fetchMock.mockResolvedValueOnce(makeResponse({ status: 503, body: {} }))
			const wrapper = mountCard({ unavailableLabel: 'Source offline' })
			await flush()
			expect(wrapper.find('.cn-integration-card__empty').text()).toBe('Source offline')
		})
	})

	describe('user-dashboard / app-dashboard surface (compact)', () => {
		it.each(['user-dashboard', 'app-dashboard'])('caps the list at COMPACT_LIMIT=5 on %s', async (surface) => {
			fetchMock.mockResolvedValueOnce(makeResponse({
				status: 200,
				body: { results: Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, title: `Row ${i}` })) },
			}))

			const wrapper = mountCard({ surface })
			await flush()

			expect(wrapper.findAll('.cn-integration-card__row')).toHaveLength(5)
		})
	})

	describe('single-entity surface', () => {
		it('fetches the entity endpoint and renders a chip with title + subtitle', async () => {
			fetchMock.mockResolvedValueOnce(makeResponse({
				status: 200,
				body: { id: 'Space.Page', title: 'Onboarding', breadcrumb: ['Space', 'Onboarding'] },
			}))

			const wrapper = mountCard({ surface: 'single-entity', value: 'Space.Page' })
			await flush()

			expect(fetchMock).toHaveBeenCalledWith(
				'/apps/openregister/api/objects/decidesk/meeting/obj-1/integrations/calendar/Space.Page',
				{ headers: { requesttoken: 'stub-token' } },
			)
			expect(wrapper.find('.cn-integration-card__chip').text()).toContain('Onboarding')
			expect(wrapper.find('.cn-integration-card__chip-sub').text()).toContain('Space')
		})

		it('renders empty state when `value` is empty', async () => {
			const wrapper = mountCard({ surface: 'single-entity', value: '', emptyLabel: 'Pick one' })
			await flush()

			expect(fetchMock).not.toHaveBeenCalled()
			expect(wrapper.find('.cn-integration-card__empty').text()).toBe('Pick one')
		})

		it('uses the `url` field as anchor href when present', async () => {
			fetchMock.mockResolvedValueOnce(makeResponse({
				status: 200,
				body: { id: 'x', title: 'A', url: 'https://example.test/x' },
			}))
			const wrapper = mountCard({ surface: 'single-entity', value: 'x' })
			await flush()

			expect(wrapper.find('.cn-integration-card__chip a').attributes('href')).toBe('https://example.test/x')
			expect(wrapper.find('.cn-integration-card__chip a').attributes('target')).toBe('_blank')
		})

		it('clears the entity when the source 503s', async () => {
			fetchMock.mockResolvedValueOnce(makeResponse({ status: 503, body: {} }))
			const wrapper = mountCard({ surface: 'single-entity', value: 'x', unavailableLabel: 'Source down' })
			await flush()
			expect(wrapper.find('.cn-integration-card__chip').exists()).toBe(false)
		})
	})

	describe('reactivity', () => {
		it('refetches when surface flips between list and single-entity', async () => {
			fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { results: [] } }))
			const wrapper = mountCard({ surface: 'detail-page' })
			await flush()

			// Two watchers fire on setProps({ surface, value }) — the
			// surface watcher routes to fetchSingle() (because surface
			// is now 'single-entity'), and the value watcher does the
			// same. Both end up hitting the entity endpoint. Provide
			// two mock responses so neither call throws on missing
			// stub, then assert the entity endpoint is what gets hit.
			fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { id: 'x', title: 'X' } }))
			fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { id: 'x', title: 'X' } }))
			await wrapper.setProps({ surface: 'single-entity', value: 'x' })
			await flush()

			expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
			// Every call after the initial detail-page mount must be
			// for the entity endpoint.
			for (const call of fetchMock.mock.calls.slice(1)) {
				expect(call[0]).toMatch(/\/integrations\/calendar\/x$/)
			}
		})

		it('refetches when integrationId changes', async () => {
			fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { results: [] } }))
			const wrapper = mountCard()
			await flush()

			fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { results: [] } }))
			await wrapper.setProps({ integrationId: 'contacts' })
			await flush()

			expect(fetchMock.mock.calls[1][0]).toContain('/integrations/contacts')
		})
	})

	describe('title fallback', () => {
		it('defaults to integrationId when title prop is empty', async () => {
			fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { results: [] } }))
			const wrapper = mountCard({ title: '' })
			await flush()
			expect(wrapper.find('.cn-detail-card').attributes('data-title')).toBe('calendar')
		})

		it('uses the title prop when provided', async () => {
			fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { results: [] } }))
			const wrapper = mountCard({ title: 'Meetings' })
			await flush()
			expect(wrapper.find('.cn-detail-card').attributes('data-title')).toBe('Meetings')
		})
	})
})

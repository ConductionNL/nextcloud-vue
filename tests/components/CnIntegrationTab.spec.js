/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnIntegrationTab — generic sidebar tab driving every leaf
 * integration that doesn't yet ship a bespoke Vue component.
 *
 * Covers:
 *   - happy path: fetches the registry sub-resource and renders rows
 *     with title + subtitle + optional external url
 *   - empty path: greenfield stubs (PHP `list()` returns []) render
 *     the empty-state label
 *   - 503 path: degraded source renders the "unavailable" banner
 *   - non-200 path: surfaces a generic "Could not load" error
 *   - unlink path: DELETE request, optimistic row removal, `unlinked`
 *     event emission
 *   - 501 on unlink path: surfaces "not supported" inline error
 *   - 503 on unlink path: flips the degraded banner on
 *   - URL composition: register / schema / objectId / integrationId
 *     all participate in the sub-resource path
 */

jest.mock('../../src/utils/index.js', () => ({
	__esModule: true,
	// buildHeaders returns a static stub; the assertions only need to
	// verify that the headers object is forwarded.
	buildHeaders: jest.fn(() => ({ requesttoken: 'stub-token' })),
}))

import { mount } from '@vue/test-utils'

import CnIntegrationTab from '../../src/components/CnIntegrationTab/CnIntegrationTab.vue'

const flush = () => new Promise((r) => setTimeout(r, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
	NcButton: {
		name: 'NcButton',
		template: '<button class="nc-button" :disabled="disabled" @click="$emit(\'click\')"><slot /><slot name="icon" /></button>',
		props: ['type', 'ariaLabel', 'disabled'],
	},
	AlertCircleOutline: true,
	LinkVariant: true,
	LinkVariantOff: true,
}

/**
 * Build a Response-like object the component's `fetch` mock can return.
 *
 * @param {object} init Response init.
 * @param {number} init.status HTTP status code.
 * @param {object} [init.body] JSON body returned by `.json()`.
 * @return {{ ok: boolean, status: number, json: () => Promise<object> }}
 */
function makeResponse({ status, body }) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: () => Promise.resolve(body),
	}
}

function mountTab(overrides = {}) {
	return mount(CnIntegrationTab, {
		stubs,
		propsData: {
			integrationId: 'calendar',
			objectId: 'obj-1',
			register: 'decidesk',
			schema: 'meeting',
			apiBase: '/apps/openregister/api',
			...overrides,
		},
	})
}

describe('CnIntegrationTab', () => {
	let fetchMock

	beforeEach(() => {
		fetchMock = jest.fn()
		global.fetch = fetchMock
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders rows from the registry sub-resource on mount', async () => {
		fetchMock.mockResolvedValueOnce(makeResponse({
			status: 200,
			body: {
				results: [
					{ id: 'meet-1', title: 'Weekly sync', url: 'https://nc/meeting/1' },
					{ id: 'meet-2', title: 'Retro', subtitle: '15 minutes' },
				],
			},
		}))

		const wrapper = mountTab()
		await flush()

		expect(fetchMock).toHaveBeenCalledWith(
			'/apps/openregister/api/objects/decidesk/meeting/obj-1/integrations/calendar',
			{ headers: { requesttoken: 'stub-token' } },
		)
		expect(wrapper.findAll('.cn-integration-tab__row')).toHaveLength(2)
		expect(wrapper.find('.cn-integration-tab__title').text()).toBe('Weekly sync')
		// External `url` renders as an anchor.
		expect(wrapper.find('a.cn-integration-tab__title').attributes('href')).toBe('https://nc/meeting/1')
		expect(wrapper.find('a.cn-integration-tab__title').attributes('target')).toBe('_blank')
	})

	it('renders empty-state for a greenfield stub returning []', async () => {
		fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { results: [] } }))

		const wrapper = mountTab({ integrationId: 'cospend', emptyLabel: 'Nothing here yet' })
		await flush()

		expect(wrapper.find('.cn-integration-tab__row').exists()).toBe(false)
		expect(wrapper.find('.cn-sidebar-tab__empty').text()).toBe('Nothing here yet')
	})

	it('renders the "unavailable" banner on a 503 from the source', async () => {
		fetchMock.mockResolvedValueOnce(makeResponse({ status: 503, body: { reason: 'provider-auth' } }))

		const wrapper = mountTab({
			integrationId: 'xwiki',
			unavailableLabel: 'XWiki is offline.',
		})
		await flush()

		expect(wrapper.find('.cn-integration-tab__banner').text()).toContain('XWiki is offline.')
		expect(wrapper.findAll('.cn-integration-tab__row')).toHaveLength(0)
	})

	it('renders a generic error on a non-200 / non-503 response', async () => {
		fetchMock.mockResolvedValueOnce(makeResponse({ status: 500, body: {} }))

		const wrapper = mountTab()
		await flush()

		expect(wrapper.find('.cn-integration-tab__error').exists()).toBe(true)
	})

	it('surfaces an error on a network fetch rejection', async () => {
		fetchMock.mockRejectedValueOnce(new Error('boom'))
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

		const wrapper = mountTab()
		await flush()

		expect(wrapper.find('.cn-integration-tab__error').exists()).toBe(true)
		consoleSpy.mockRestore()
	})

	it('DELETEs the row and emits `unlinked` on the unlink button click', async () => {
		fetchMock.mockResolvedValueOnce(makeResponse({
			status: 200,
			body: { results: [{ id: 'row-1', title: 'A row' }] },
		}))
		// Second call is the DELETE.
		fetchMock.mockResolvedValueOnce(makeResponse({ status: 204, body: null }))

		const wrapper = mountTab()
		await flush()

		await wrapper.find('button.nc-button').trigger('click')
		await flush()

		const calls = fetchMock.mock.calls
		expect(calls[1][0]).toBe('/apps/openregister/api/objects/decidesk/meeting/obj-1/integrations/calendar/row-1')
		expect(calls[1][1]).toMatchObject({ method: 'DELETE' })
		expect(wrapper.emitted('unlinked')).toBeTruthy()
		expect(wrapper.emitted('unlinked')[0]).toEqual(['row-1'])
		expect(wrapper.findAll('.cn-integration-tab__row')).toHaveLength(0)
	})

	it('surfaces "not supported" on 501 from the unlink DELETE', async () => {
		fetchMock.mockResolvedValueOnce(makeResponse({
			status: 200,
			body: { results: [{ id: 'row-1', title: 'A row' }] },
		}))
		fetchMock.mockResolvedValueOnce(makeResponse({ status: 501, body: { message: 'not implemented' } }))

		const wrapper = mountTab()
		await flush()
		await wrapper.find('button.nc-button').trigger('click')
		await flush()

		// Component sets `error` on 501; per the template the error
		// branch displaces the rows list (v-if/v-else-if). Verifying
		// the error renders is enough — the row is preserved in
		// component state and reappears once the error clears.
		expect(wrapper.find('.cn-integration-tab__error').exists()).toBe(true)
		expect(wrapper.find('.cn-integration-tab__error').text()).toMatch(/[Nn]ot supported|Unlink/)
		// No `unlinked` event emitted on a 501 response.
		expect(wrapper.emitted('unlinked')).toBeFalsy()
	})

	it('flips the degraded banner on 503 from the unlink DELETE', async () => {
		fetchMock.mockResolvedValueOnce(makeResponse({
			status: 200,
			body: { results: [{ id: 'row-1', title: 'A row' }] },
		}))
		fetchMock.mockResolvedValueOnce(makeResponse({ status: 503, body: {} }))

		const wrapper = mountTab({ unavailableLabel: 'Source gone offline' })
		await flush()
		await wrapper.find('button.nc-button').trigger('click')
		await flush()

		expect(wrapper.find('.cn-integration-tab__banner').text()).toContain('Source gone offline')
	})

	it('hides the unlink button when allowUnlink is false', async () => {
		fetchMock.mockResolvedValueOnce(makeResponse({
			status: 200,
			body: { results: [{ id: 'row-1', title: 'Row' }] },
		}))

		const wrapper = mountTab({ allowUnlink: false })
		await flush()

		expect(wrapper.findAll('button.nc-button')).toHaveLength(0)
	})

	it('refetches when integrationId changes', async () => {
		fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { results: [] } }))
		const wrapper = mountTab({ integrationId: 'calendar' })
		await flush()

		fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { results: [] } }))
		await wrapper.setProps({ integrationId: 'contacts' })
		await flush()

		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(fetchMock.mock.calls[1][0]).toContain('/integrations/contacts')
	})

	it('renders breadcrumb as subtitle when row provides one', async () => {
		fetchMock.mockResolvedValueOnce(makeResponse({
			status: 200,
			body: { results: [{ id: 'a', title: 'My page', breadcrumb: ['Space', 'Sub', 'My page'] }] },
		}))

		const wrapper = mountTab({ integrationId: 'xwiki' })
		await flush()

		expect(wrapper.find('.cn-integration-tab__subtitle').text()).toBe('Space / Sub')
	})
})

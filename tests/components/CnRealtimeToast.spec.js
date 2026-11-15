/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRealtimeToast (DqWerkbord "Zojuist bijgewerkt door Anouk Bakker"): a
 * change by someone else shows one dark toast with a close button and asks
 * the page to read again; the reader's own change shows nothing.
 *
 * @spec openspec/changes/realtime-toast/specs/realtime-toast/spec.md#requirement-a-change-by-someone-else-shows-a-toast
 */
import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnRealtimeToast from '../../src/components/CnRealtimeToast/CnRealtimeToast.vue'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => ({ cnFetchJson: (...a) => mockFetchJson(...a) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: () => ({ uid: 'me' }) }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const CHANGE = { id: 'c1', actor: 'Anouk Bakker', actorId: 'anouk', text: 'Openbare verlichting fietspad Lindelaan staat nu op Besluit.' }

/**
 * @param {object} props The props.
 * @return {object} The toast.
 */
function mountToast(props) {
	return mount(CnRealtimeToast, {
		props,
		global: { provide: { cnTranslate: (key) => ({ 'Updated by {actor}': 'Zojuist bijgewerkt door {actor}' }[key] ?? key) }, stubs: { CnIcon: true } },
	})
}

describe('CnRealtimeToast', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		mockFetchJson.mockReset()
		emit.mockReset()
	})
	afterEach(() => jest.useRealTimers())

	it('learns now on the first poll, then shows a change by someone else and asks for a refresh', async () => {
		mockFetchJson
			.mockResolvedValueOnce({ changes: [{ ...CHANGE, id: 'old' }], now: '2026-11-04T10:00:00Z' })
			.mockResolvedValueOnce({ changes: [CHANGE], now: '2026-11-04T10:00:15Z' })
		const w = mountToast({ source: { url: '/apps/dossiq/api/board/changes', interval: 15000 }, titleTemplate: 'Updated by {actor}' })
		await flushPromises()
		expect(w.find('[data-testid="cn-realtime-toast"]').exists()).toBe(false)
		jest.advanceTimersByTime(15000)
		await flushPromises()
		expect(mockFetchJson).toHaveBeenLastCalledWith('/index.php/apps/dossiq/api/board/changes?since=2026-11-04T10%3A00%3A00Z')
		const toast = w.find('[data-testid="cn-realtime-toast"]')
		expect(toast.attributes('role')).toBe('status')
		expect(w.find('[data-testid="cn-realtime-toast-title"]').text()).toBe('Zojuist bijgewerkt door Anouk Bakker')
		expect(toast.text()).toContain('staat nu op Besluit')
		expect(w.emitted('change')).toHaveLength(1)
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', {})
		await w.find('[data-testid="cn-realtime-toast-close"]').trigger('click')
		expect(w.find('[data-testid="cn-realtime-toast"]').exists()).toBe(false)
		w.unmount()
	})

	it('ignores the reader\'s own change and takes a change from a channel', async () => {
		const w = mountToast({ channel: 'dossiq:case:changed', refreshOnChange: false })
		w.vm.receive({ ...CHANGE, actorId: 'me' })
		await flushPromises()
		expect(w.find('[data-testid="cn-realtime-toast"]').exists()).toBe(false)
		w.vm.receive(CHANGE)
		await flushPromises()
		expect(w.find('[data-testid="cn-realtime-toast-title"]').text()).toBe('Just updated by Anouk Bakker')
		expect(emit).not.toHaveBeenCalled()
		w.unmount()
	})
})

describe('CnIndexPage realtime', () => {
	/**
	 * @param {object} realtime The realtime config.
	 * @return {object} The page.
	 * @spec openspec/changes/realtime-toast/specs/realtime-toast/spec.md#requirement-an-index-page-follows-changes-live
	 */
	function mountPage(realtime) {
		return mount(CnIndexPage, {
			props: { title: 'Zaken', schema: { title: 'Zaak', properties: {} }, objects: [{ id: 1 }], realtime },
			global: {
				provide: { cnTranslate: (key) => key },
				mocks: { $router: { push: jest.fn(() => Promise.resolve()), resolve: () => ({ href: '#' }) }, $route: { query: {}, params: {}, name: 'Cases', path: '/cases' } },
				stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnRealtimeToast: { name: 'CnRealtimeToast', props: ['source'], template: '<div class="rt" />' } },
			},
		})
	}

	it('follows changes in a listed view only', () => {
		expect(mountPage({ url: '/apps/dossiq/api/cases/changes', views: ['board'] }).find('.rt').exists()).toBe(false)
		const page = mountPage({ url: '/apps/dossiq/api/cases/changes' })
		expect(page.findComponent({ name: 'CnRealtimeToast' }).props('source')).toEqual({ url: '/apps/dossiq/api/cases/changes', interval: undefined })
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * card-state-notices (R1) on the hosts: a detail widget's manifest `notices`
 * and the answers of the actions run from its card land in that card; an
 * index page draws `notices` above its list; the `cn:page:notice` channel
 * reaches either.
 *
 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-detail-widget-declares-its-notices
 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-an-index-page-draws-its-notices-above-the-list
 */
import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { PAGE_NOTICE_CHANNEL } from '../../src/utils/cardNotices.js'

jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: jest.fn(async () => ({})) }
})

const busHandlers = {}
jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn((channel, payload) => (busHandlers[channel] || []).forEach((handler) => handler(payload))),
	subscribe: jest.fn((channel, handler) => { (busHandlers[channel] = busHandlers[channel] || []).push(handler) }),
	unsubscribe: jest.fn((channel, handler) => { busHandlers[channel] = (busHandlers[channel] || []).filter((h) => h !== handler) }),
}))

describe('detail widget host', () => {
	/**
	 * @param {object} widget The widget.
	 * @param {Function} [dispatch] The page dispatcher.
	 * @return {object} The mounted host.
	 */
	function mountHost(widget, dispatch = jest.fn()) {
		return mount(CnDetailWidgetHost, {
			props: { widget, chrome: 'card', showCardTitle: true, object: { status: 'open' }, objectId: 'case-1' },
			global: { provide: { cnTranslate: (key) => key, cnDispatchAction: dispatch } },
		})
	}

	const widget = {
		id: 'tasks',
		type: 'field-list',
		title: 'Taken op deze zaak',
		content: { fields: [] },
		notices: [{ variant: 'warning', text: 'Wacht op advies', visibleWhen: { field: 'status', value: 'open' } }],
	}

	it('draws the manifest notices in the card, above the body', async () => {
		const w = mountHost(widget)
		await flushPromises()
		const banner = w.find('.cn-widget-wrapper__notices [data-testid="cn-notice-widget"]')
		expect(banner.text()).toBe('Wacht op advies')
		expect(banner.attributes('role')).toBe('status')
	})

	it('passes showNotice to the page dispatcher, and an answered notice lands in the card', async () => {
		const dispatch = jest.fn()
		const w = mountHost(widget, dispatch)
		w.vm.actionContext.dispatch({ type: 'api-call', url: '/x' })
		expect(dispatch).toHaveBeenCalledWith({ type: 'api-call', url: '/x' }, expect.objectContaining({ showNotice: expect.any(Function) }))
		dispatch.mock.calls[0][1].showNotice({ variant: 'error', text: 'Annuleren geweigerd' })
		await flushPromises()
		const banners = w.findAll('.cn-widget-wrapper__notices [data-testid="cn-notice-widget"]')
		expect(banners.map((b) => b.text())).toEqual(['Wacht op advies', 'Annuleren geweigerd'])
		expect(banners[1].attributes('role')).toBe('alert')
		// The next action from the card clears the earlier answer.
		w.vm.dispatchFromCard({ type: 'refresh' })
		await flushPromises()
		expect(w.findAll('.cn-widget-wrapper__notices [data-testid="cn-notice-widget"]')).toHaveLength(1)
	})

	it('takes a notice raised for its widget id on the page channel', async () => {
		const w = mountHost(widget)
		emit(PAGE_NOTICE_CHANNEL, { widgetId: 'other', notice: { text: 'Niet voor mij' } })
		emit(PAGE_NOTICE_CHANNEL, { widgetId: 'tasks', notice: { variant: 'success', text: 'Taak afgerond.' } })
		await flushPromises()
		const texts = w.findAll('[data-testid="cn-notice-widget"]').map((b) => b.text())
		expect(texts).toContain('Taak afgerond.')
		expect(texts).not.toContain('Niet voor mij')
		w.unmount()
	})
})

describe('index page', () => {
	/**
	 * @param {Array<object>} notices The notices.
	 * @return {object} The page.
	 */
	function mountPage(notices) {
		return mount(CnIndexPage, {
			props: { title: 'Teamwachtrij', schema: { title: 'Taak', properties: {} }, objects: [{ id: 1 }], notices },
			global: {
				provide: { cnTranslate: (key) => key },
				mocks: {
					$router: { push: jest.fn(() => Promise.resolve()), resolve: (to) => ({ href: `/apps/dossiq/${to.name}` }) },
					$route: { query: {}, params: {}, name: 'Queue', path: '/queue' },
				},
				stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
			},
		})
	}

	it('draws its notices above the list, and one raised on the page channel', async () => {
		const w = mountPage([{ variant: 'warning', title: 'Bron niet beschikbaar: taken uit pipelinq.', text: 'Die staan nu niet in deze wachtrij.' }])
		await flushPromises()
		const html = w.html()
		expect(w.find('.cn-index-page__notices [data-testid="cn-notice-widget"]').text()).toContain('Bron niet beschikbaar')
		expect(html.indexOf('cn-index-page__notices')).toBeLessThan(html.indexOf('cn-index-page__body'))
		emit(PAGE_NOTICE_CHANNEL, { notice: { variant: 'success', title: '2 zaken verplaatst.', text: 'Een zonder al zijn acties.' } })
		await flushPromises()
		expect(w.findAll('.cn-index-page__notices [data-testid="cn-notice-widget"]')).toHaveLength(2)
		w.unmount()
	})
})

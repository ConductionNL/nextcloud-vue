/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page can link its sibling pages as tabs with counts, and show a
 * notice under its list (index-page-tabs-notice): DqPrivacy's "AVG-verzoeken
 * 12 | Datalekken 2" and its explaining band.
 *
 * @spec openspec/changes/index-page-tabs-notice/specs/index-page/spec.md#requirement-an-index-page-can-link-its-sibling-pages-as-tabs
 * @spec openspec/changes/index-page-tabs-notice/specs/index-page/spec.md#requirement-an-index-page-can-show-a-notice-under-its-list
 */
import { flushPromises, mount } from '@vue/test-utils'

const mockTotal = jest.fn()
jest.mock('../../src/utils/fetchFilterCounts.js', () => {
	const actual = jest.requireActual('../../src/utils/fetchFilterCounts.js')
	return { ...actual, fetchListTotal: (...a) => mockTotal(...a) }
})

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const TABS = [
	{ label: 'AVG-verzoeken', route: 'AvgRequests', countFrom: { register: 'dossiq', schema: 'case', filter: { caseType: 'avg' } } },
	{ label: 'Datalekken', route: 'DataBreaches', countFrom: { register: 'dossiq', schema: 'case', filter: { caseType: 'lek' } } },
]

function mountPage(props = {}) {
	return mount(CnIndexPage, {
		props: { title: 'AVG-verzoeken', schema: { title: 'Zaak', properties: {} }, objects: [{ id: 1 }], ...props },
		global: {
			provide: { cnTranslate: (key) => key },
			mocks: {
				$router: { push: jest.fn(() => Promise.resolve()), resolve: (to) => ({ href: `/apps/dossiq/${to.name}` }) },
				$route: { query: {}, params: {}, name: 'AvgRequests', path: '/privacy' },
			},
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
		},
	})
}

beforeEach(() => {
	mockTotal.mockReset()
	mockTotal.mockImplementation(async (register, schema, filter) => (filter.caseType === 'avg' ? 12 : 2))
})

describe('CnIndexPage page tabs', () => {
	it('draws the manifest tabs with their counts and marks the current page', async () => {
		const w = mountPage({ pageTabs: TABS })
		await flushPromises()
		const tabs = w.findAll('.cn-index-page__page-tab')
		expect(tabs.map((tab) => tab.text().replace(/\s+/g, ' '))).toEqual(['AVG-verzoeken 12', 'Datalekken 2'])
		expect(tabs[0].attributes('href')).toBe('/apps/dossiq/AvgRequests')
		expect(tabs[0].attributes('aria-current')).toBe('page')
		expect(tabs[1].attributes('aria-current')).toBeUndefined()
	})

	it('follows a tab on the router', async () => {
		const w = mountPage({ pageTabs: TABS })
		await flushPromises()
		await w.findAll('.cn-index-page__page-tab')[1].trigger('click')
		expect(w.vm.$router.push).toHaveBeenCalledWith({ name: 'DataBreaches' })
	})

	it('draws no strip without pageTabs', () => {
		expect(mountPage().find('[data-testid="cn-index-page-tabs"]').exists()).toBe(false)
	})
})

describe('CnIndexPage notice', () => {
	it('draws the notice under the list in its variant', () => {
		const w = mountPage({ notice: { text: 'Een AVG-verzoek is een zaak.', variant: 'success' } })
		const notice = w.find('[data-testid="cn-index-page-notice"]')
		expect(notice.text()).toContain('Een AVG-verzoek is een zaak.')
		expect(w.vm.noticeType).toBe('success')
	})

	it('defaults to info and draws nothing without text', () => {
		expect(mountPage({ notice: { text: 'x', variant: 'odd' } }).vm.noticeType).toBe('info')
		expect(mountPage({ notice: { variant: 'info' } }).find('[data-testid="cn-index-page-notice"]').exists()).toBe(false)
	})
})

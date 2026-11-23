/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaken, DqZoekresultaten: a term the server cannot read keeps the rows
 * and says so in an alert under the search field: "Zoekterm niet begrepen op
 * positie 9:", the server's reason, then that the list is not filtered.
 *
 * @spec openspec/changes/search-refusal-notice/specs/index-search-refusal/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnSearchPage from '../../src/components/CnSearchPage/CnSearchPage.vue'
import { searchRefusalNotice } from '../../src/utils/searchRefusal.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => (vars ? vars[k] : k)) }))

const REFUSED = { message: 'Unclosed bracket.', position: 9, term: 'verzoek (2026', before: 'verzoek ', at: '(', after: '2026' }

/** @return {Promise<void>} */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

describe('searchRefusalNotice', () => {
	it('builds the alert with the library words', () => {
		expect(searchRefusalNotice(REFUSED)).toEqual({
			id: 'search-refusal',
			variant: 'error',
			role: 'alert',
			layout: 'inline',
			title: 'Search term not understood at position 9:',
			text: 'Unclosed bracket. The list is not filtered; adjust the term.',
		})
	})

	it('takes the page\'s own words', () => {
		const notice = searchRefusalNotice(REFUSED, { title: 'At {position}:', after: 'Try again.' })
		expect(notice.title).toBe('At 9:')
		expect(notice.text).toBe('Unclosed bracket. Try again.')
	})
})

describe('CnIndexPage searchRefusal', () => {
	afterEach(() => jest.restoreAllMocks())

	/**
	 * @param {object} extra Extra props.
	 * @return {object} The mounted page, refused.
	 */
	function mountRefused(extra = {}) {
		jest.spyOn(CnIndexPage.computed, 'searchRefused').mockReturnValue(REFUSED)
		return mount(CnIndexPage, {
			propsData: { title: 'Cases', schema: { title: 'Case', properties: {} }, objects: [{ id: 1 }], pagination: { page: 1, pages: 1, total: 1, limit: 20 }, ...extra },
			global: {
				mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
				stubs: { CnActionsBar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnIndexSidebar: true, CnCardNotices: { name: 'CnCardNotices', props: ['notices'], template: '<div class="notices" />' } },
			},
		})
	}

	it('keeps the rows and raises the alert above the list', () => {
		const w = mountRefused({ searchRefusal: {} })
		expect(w.vm.effectiveObjects).toEqual([{ id: 1 }])
		expect(w.find('[data-testid="cn-index-page-search-refusal"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-index-page-fetch-error"]').exists()).toBe(false)
		expect(w.findComponent({ name: 'CnCardNotices' }).props('notices')[0]).toMatchObject({ id: 'search-refusal', title: 'Search term not understood at position 9:' })
	})

	it('draws the refusal in place of the rows without searchRefusal (control)', () => {
		const w = mountRefused()
		expect(w.find('[data-testid="cn-index-page-search-refusal"]').exists()).toBe(true)
	})
})

describe('CnSearchPage refused term', () => {
	const SOURCES = [{ id: 'cases', label: 'Cases', register: 'dossiq', schema: 'case' }]

	it('keeps the last results and says so under the field', async () => {
		axios.get.mockReset()
		axios.get.mockResolvedValueOnce({ data: { results: [{ id: 'c1', title: 'Verzoek' }], total: 1 } })
		const w = mount(CnSearchPage, { props: { sources: SOURCES }, global: { mocks: { $router: { push: jest.fn() } } } })
		await w.find('[data-testid="cn-search-page-input"]').setValue('verzoek')
		await w.find('form').trigger('submit')
		await flush()
		axios.get.mockRejectedValueOnce({ response: { status: 400, data: { error: 'query-syntax', position: 9, token: '(', message: 'Unclosed bracket.' } } })
		await w.find('[data-testid="cn-search-page-input"]').setValue('verzoek (2026')
		await w.find('form').trigger('submit')
		await flush()
		expect(w.find('[data-testid="cn-search-page-refusal"]').text()).toContain('Search term not understood at position 9:')
		expect(w.text()).toContain('Verzoek')
	})
})

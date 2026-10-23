/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page opened from a list offers next and previous within that list
 * (case-page-and-list-as-a-place, REQ-CPL-02). CnPageRenderer reads the list
 * the address names (`_from`), fetches it with the address's search, sort and
 * filters, and hands CnDetailPage `listNavigation`, `previousTo` and `nextTo`.
 * A record reached by a bare link gets none, and a detail page that does not
 * opt in (`listNavigation: true`) gets none either and fetches nothing.
 *
 * @spec openspec/changes/detail-list-navigation-wired/specs/detail-list-navigation-wired/spec.md#requirement-a-manifest-detail-page-offers-next-and-previous-within-its-list
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (path, params = {}) => '/index.php' + path.replace(/\{(\w+)\}/g, (all, key) => params[key]) }))

import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'

const PAGES = [
	{ id: 'Cases', type: 'index', config: { register: 'dossiq', schema: 'case' } },
	{ id: 'Custom', type: 'index', config: { register: 'dossiq', schema: 'case', source: { url: '/apps/dossiq/api/x' } } },
	{ id: 'CaseDetail', type: 'detail', listNavigation: true, config: { register: 'dossiq', schema: 'case' } },
	{ id: 'TaskDetail', type: 'detail', config: { register: 'dossiq', schema: 'task' } },
]

function context(query) {
	return { $route: { query, params: { id: 'c-2' } }, pageById: new Map(PAGES.map((p) => [p.id, p])), currentPage: PAGES[2] }
}

const fetchList = CnPageRenderer.methods.fetchListForNavigation
const navProps = CnPageRenderer.methods.listNavigationProps

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { results: [{ id: 'c-1' }, { id: 'c-2' }, { id: 'c-3' }] } })
})

describe('CnPageRenderer list navigation', () => {
	it('fetches the list the address names, on OpenRegister, with its params', async () => {
		const rows = await fetchList.call(context({ _from: 'Cases' }), { _limit: 200, status: 'open' })
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/dossiq/case', { params: { _limit: 200, status: 'open' } })
		expect(rows.map((r) => r.id)).toEqual(['c-1', 'c-2', 'c-3'])
	})

	it('fetches nothing for a list with its own source, or without one named', async () => {
		await expect(fetchList.call(context({ _from: 'Custom' }), {})).rejects.toThrow()
		await expect(fetchList.call(context({}), {})).rejects.toThrow()
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('is off by default: a page without listNavigation fetches nothing and gets no controls', async () => {
		const ctx = { ...context({ _from: 'Cases' }), currentPage: PAGES[3] }
		await expect(fetchList.call(ctx, {})).rejects.toThrow()
		expect(mockGet).not.toHaveBeenCalled()
		const nav = { available: { value: true }, isFirst: { value: true }, isLast: { value: false }, position: { value: 1 }, total: { value: 2 }, previousRoute: { value: null }, nextRoute: { value: {} } }
		expect(navProps.call({ listNav: nav, currentPage: PAGES[3] })).toEqual({})
	})

	it('hands the detail page the controls only when the record is in the list', () => {
		const nav = {
			available: { value: true },
			isFirst: { value: false },
			isLast: { value: false },
			position: { value: 2 },
			total: { value: 3 },
			previousRoute: { value: { name: 'CaseDetail', params: { id: 'c-1' } } },
			nextRoute: { value: { name: 'CaseDetail', params: { id: 'c-3' } } },
		}
		expect(navProps.call({ listNav: nav, currentPage: PAGES[2] })).toEqual({
			listNavigation: { available: true, isFirst: false, isLast: false, position: 2, total: 3 },
			previousTo: { name: 'CaseDetail', params: { id: 'c-1' } },
			nextTo: { name: 'CaseDetail', params: { id: 'c-3' } },
		})
		expect(navProps.call({ listNav: { ...nav, available: { value: false } }, currentPage: PAGES[2] })).toEqual({})
		expect(navProps.call({ listNav: nav, currentPage: PAGES[0] })).toEqual({})
	})
})

describe('the listNavigation page key', () => {
	it('validates on a page as a boolean', async () => {
		const { validateManifestV2 } = await import('../../src/utils/validateManifest.js')
		const manifest = (listNavigation) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '2.0.0',
			menu: [],
			pages: [{ id: 'case', route: '/cases/:id', type: 'detail', title: 'Case', listNavigation, config: { register: 'r', schema: 's' } }],
		})
		expect(validateManifestV2(manifest(true)).valid).toBe(true)
		expect(validateManifestV2(manifest('yes')).valid).toBe(false)
	})
})

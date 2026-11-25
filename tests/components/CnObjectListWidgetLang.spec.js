/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every OpenRegister list request carries `_lang`, the page's language
 * (`<html lang>`, which Nextcloud sets from the user's language), so
 * translatable fields come back in it, and `en` when the page names no
 * language (REQ-OR-003).
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p.register).replace('{schema}', p.schema) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

function mountWidget(content = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'r', schema: 's', limit: 5, ...content } },
		stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true },
		mocks: { t: (_a, s) => s },
	})
}

describe('CnObjectListWidget _lang', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		globalThis._nc_l10n_language = 'nl'
		document.documentElement.lang = 'nl'
		mockGet.mockImplementation((url) => Promise.resolve({
			data: url.includes('/child') ? { results: [], total: 0 } : { results: [{ id: '1', parent: 'p1' }], total: 1 },
		}))
	})
	afterEach(() => {
		delete globalThis._nc_l10n_language
		document.documentElement.removeAttribute('lang')
	})

	it('sends the user language on the list request', async () => {
		mountWidget()
		await flushPromises()
		expect(mockGet.mock.calls[0][1].params._lang).toBe('nl')
	})

	it('sends it on the children request too', async () => {
		mountWidget({ children: { schema: 'child', filter: { parentId: '@row.parent' } } })
		await flushPromises()
		const child = mockGet.mock.calls.find(([url]) => url.includes('/child'))
		expect(child).toBeTruthy()
		expect(child[1].params._lang).toBe('nl')
	})

	it('sends en, not the browser language, when the page has no lang attribute', async () => {
		document.documentElement.removeAttribute('lang')
		globalThis._nc_l10n_language = 'en-US'
		mountWidget()
		await flushPromises()
		expect(mockGet.mock.calls[0][1].params._lang).toBe('en')
	})
})

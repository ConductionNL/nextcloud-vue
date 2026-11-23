/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look draws an inline search on every index page; a page whose
 * board has none turns it off with `config.search: false`.
 */
import { shallowMount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: { results: [], total: 0 } })) } }))

/**
 * @param {object} props Extra props.
 * @param {string} look The look.
 * @return {boolean} Whether the actions bar draws its search.
 */
function barSearch(props, look) {
	const w = shallowMount(CnIndexPage, {
		props: { title: 'Cases', objects: [{ id: '1' }], ...props },
		global: { provide: { cnLook: look }, mocks: { $route: { query: {}, params: {} }, $router: { replace: jest.fn(async () => {}) } } },
	})
	return w.findComponent({ name: 'CnActionsBar' }).props('showSearch')
}

describe('CnIndexPage optional inline search', () => {
	it('draws the board search by default', () => {
		expect(barSearch({}, 'board')).toBe(true)
	})

	it('drops it with search: false', () => {
		expect(barSearch({ search: false }, 'board')).toBe(false)
		expect(barSearch({ search: false, inlineSearch: true }, 'nextcloud')).toBe(false)
	})

	it('keeps the Nextcloud look without an inline search unless asked', () => {
		expect(barSearch({}, 'nextcloud')).toBe(false)
		expect(barSearch({ inlineSearch: true }, 'nextcloud')).toBe(true)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqContracten draws its notice ("Verlengen en opzeggen zijn besluiten ...")
 * under the list card, on the page ground, not inside the card.
 * `notice.placement: 'page'` puts it there; without it the notice stays under
 * the rows, inside the list, as before.
 *
 * @spec openspec/changes/index-notice-below-card/specs/index-page/spec.md#requirement-an-index-page-notice-can-sit-under-the-list-card
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

function mountPage(notice) {
	return mount(CnIndexPage, {
		props: { title: 'Contracten', schema: { title: 'Contract', properties: {} }, objects: [{ id: 1 }], notice },
		global: {
			provide: { cnTranslate: (key) => key },
			mocks: {
				$router: { push: jest.fn(() => Promise.resolve()), resolve: (to) => ({ href: `/apps/dossiq/${to.name}` }) },
				$route: { query: {}, params: {}, name: 'Contracts', path: '/procurement/contracts' },
			},
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
		},
	})
}

describe('CnIndexPage notice placement', () => {
	it('keeps the notice inside the list without a placement', () => {
		const w = mountPage({ text: 'Verlengen is een besluit.' })
		expect(w.find('.cn-index-page__main [data-testid="cn-index-page-notice"]').exists()).toBe(true)
	})

	it('draws the notice under the list card with placement page', () => {
		const w = mountPage({ text: 'Verlengen is een besluit.', placement: 'page' })
		const notices = w.findAll('[data-testid="cn-index-page-notice"]')
		expect(notices).toHaveLength(1)
		expect(w.find('.cn-index-page__main [data-testid="cn-index-page-notice"]').exists()).toBe(false)
		expect(notices[0].classes()).toContain('cn-index-page__notice--page')
		expect(notices[0].text()).toContain('Verlengen is een besluit.')
	})
})

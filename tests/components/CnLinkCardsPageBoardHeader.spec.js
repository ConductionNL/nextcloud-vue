/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a links page draws the page's own header as the boards do
 * (PqModules "Modules en meer", PqReports "Rapportages"): the title as the
 * page's h1 with the buildiq square on its row and the line under it. The
 * plain look keeps its h2. pl2: "pageHeader missing on live", "buildiq
 * missing on live".
 *
 * @spec openspec/changes/links-page-board-header/specs/links-page-board-header/spec.md#requirement-a-board-links-page-draws-the-page-header
 */
import { mount } from '@vue/test-utils'
import CnLinkCardsPage from '../../src/components/CnLinkCardsPage/CnLinkCardsPage.vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

/**
 * @param {string} look The app look.
 * @return {object} The mounted page.
 */
function mountPage(look) {
	return mount(CnLinkCardsPage, {
		props: { title: 'Modules and more', description: 'Every page.', cards: [] },
		global: {
			provide: { cnLook: look },
			stubs: { CnBuildiqEditButton: { template: '<div class="cn-buildiq-edit-stub" />' } },
			mocks: { $router: { resolve: () => ({ href: '#' }) } },
		},
	})
}

describe('CnLinkCardsPage: the board header', () => {
	it('draws the title as the h1 with the buildiq square on its row', () => {
		const wrapper = mountPage('board')
		expect(wrapper.classes()).toContain('cn-link-cards-page--board')
		const row = wrapper.find('.cn-link-cards-page__title-row')
		expect(row.find('h1').text()).toBe('Modules and more')
		expect(row.find('.cn-link-cards-page__header-actions .cn-buildiq-edit-stub').exists()).toBe(true)
		expect(wrapper.find('.cn-link-cards-page__description').text()).toBe('Every page.')
	})

	it('keeps the plain h2 header in the Nextcloud look', () => {
		const wrapper = mountPage('nextcloud')
		expect(wrapper.find('h1').exists()).toBe(false)
		expect(wrapper.find('h2.cn-link-cards-page__title').text()).toBe('Modules and more')
		expect(wrapper.find('.cn-buildiq-edit-stub').exists()).toBe(false)
	})
})

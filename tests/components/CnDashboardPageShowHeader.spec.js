/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `showHeader: false` drops the dashboard's header row so a page can open
 * with its greeting widget, as the Zuiddrecht dashboard does. The title stays
 * as a visually hidden heading. By default nothing changes.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-dashboard-page-can-hide-its-header
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div class="grid-stub" />', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	NcButton: { template: '<button class="nc-button-stub"><slot /></button>' },
	NcEmptyContent: { template: '<div class="nc-empty-content-stub" />' },
	NcLoadingIcon: { template: '<div class="nc-loading-icon-stub" />' },
}

function mountPage(props) {
	return mount(CnDashboardPage, {
		props: { title: 'Dashboard', description: 'Your work today', widgets: [], layout: [], ...props },
		global: { stubs },
	})
}

describe('CnDashboardPage — showHeader', () => {
	it('renders the header row by default', () => {
		const wrapper = mountPage({})
		expect(wrapper.find('[data-testid="cn-dashboard-page-header"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-dashboard-page-hidden-title"]').exists()).toBe(false)
		expect(wrapper.find('.cn-dashboard-page__title').text()).toBe('Dashboard')
	})

	it('drops the header row and keeps a visually hidden heading with showHeader: false', () => {
		const wrapper = mountPage({ showHeader: false })
		expect(wrapper.find('[data-testid="cn-dashboard-page-header"]').exists()).toBe(false)
		expect(wrapper.find('.cn-dashboard-page__description').exists()).toBe(false)
		const hidden = wrapper.find('[data-testid="cn-dashboard-page-hidden-title"]')
		expect(hidden.exists()).toBe(true)
		expect(hidden.classes()).toContain('hidden-visually')
		expect(hidden.text()).toBe('Dashboard')
	})
})

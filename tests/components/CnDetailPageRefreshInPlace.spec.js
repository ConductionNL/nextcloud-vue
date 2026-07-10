/**
 * Tests for CnDetailPage's in-place refresh behaviour: the full-page loading
 * spinner shows only on the FIRST load; once content has been shown, a
 * subsequent `loading` keeps the content in place and surfaces as the
 * action-button spinner (`effectiveRefreshing`) instead of blanking the page.
 */

import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const stubs = {
	NcButton: true,
	NcEmptyContent: true,
	NcLoadingIcon: true,
	NcActions: true,
	NcActionButton: true,
	NcActionLink: true,
	CnIcon: true,
	CnLockedBanner: true,
	CnTranslatedBadge: true,
	CnSuggestFeatureModal: true,
	AlertCircleOutline: true,
	InformationOutline: true,
	Refresh: true,
	DotsHorizontal: true,
	LightbulbOutline: true,
	BookOpenVariant: true,
}

const mountPage = (propsData = {}) => mount(CnDetailPage, {
	propsData: { title: 'Expense', ...propsData },
	stubs,
	mocks: { $route: { name: 'expense-detail' } },
	slots: { default: '<div class="my-content">CONTENT</div>' },
})

describe('CnDetailPage — in-place refresh', () => {
	it('shows the full-page loading spinner on the first load', () => {
		const wrapper = mountPage({ loading: true })
		expect(wrapper.find('.cn-detail-page__loading').exists()).toBe(true)
		expect(wrapper.find('.my-content').exists()).toBe(false)
		expect(wrapper.vm.showLoadingState).toBe(true)
	})

	it('keeps content in place when loading toggles again after the first load', async () => {
		const wrapper = mountPage({ loading: true })
		// First load completes.
		await wrapper.setProps({ loading: false })
		expect(wrapper.find('.my-content').exists()).toBe(true)
		expect(wrapper.vm.hasLoadedOnce).toBe(true)

		// Refresh: loading goes true again — content must stay, no spinner.
		await wrapper.setProps({ loading: true })
		expect(wrapper.find('.cn-detail-page__loading').exists()).toBe(false)
		expect(wrapper.find('.my-content').exists()).toBe(true)
		expect(wrapper.vm.showLoadingState).toBe(false)
		// The refresh surfaces on the action button instead.
		expect(wrapper.vm.effectiveRefreshing).toBe(true)
	})

	it('does not spin the action button during the first load', () => {
		const wrapper = mountPage({ loading: true })
		expect(wrapper.vm.effectiveRefreshing).toBe(false)
	})
})

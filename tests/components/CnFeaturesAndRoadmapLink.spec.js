/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnFeaturesAndRoadmapLink — the NcAppNavigationItem entry mounted in
 * consuming apps' settings nav, navigating to the configured route.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnFeaturesAndRoadmapLink")
 */

import { mount } from '@vue/test-utils'

import CnFeaturesAndRoadmapLink from '../../src/components/CnFeaturesAndRoadmapLink/CnFeaturesAndRoadmapLink.vue'

// Stub NcAppNavigationItem so the test does not pull the entire @nextcloud/vue tree.
const NcAppNavigationItemStub = {
	name: 'NcAppNavigationItem',
	props: ['name', 'to'],
	template: '<a :data-name="name" :data-to-name="to && to.name"><slot name="icon" /></a>',
}

const mountOpts = {
	stubs: {
		NcAppNavigationItem: NcAppNavigationItemStub,
		RoadVariant: true,
	},
}

describe('CnFeaturesAndRoadmapLink', () => {
	it('renders an NcAppNavigationItem by default', () => {
		const wrapper = mount(CnFeaturesAndRoadmapLink, mountOpts)
		const item = wrapper.findComponent(NcAppNavigationItemStub)
		expect(item.exists()).toBe(true)
	})

	it('navigates to the default route name "features-roadmap"', () => {
		const wrapper = mount(CnFeaturesAndRoadmapLink, mountOpts)
		const item = wrapper.findComponent(NcAppNavigationItemStub)
		expect(item.props('to')).toEqual({ name: 'features-roadmap' })
	})

	it('navigates to a custom route name when routeName prop is set', () => {
		const wrapper = mount(CnFeaturesAndRoadmapLink, {
			...mountOpts,
			propsData: { routeName: 'roadmap' },
		})
		const item = wrapper.findComponent(NcAppNavigationItemStub)
		expect(item.props('to')).toEqual({ name: 'roadmap' })
	})

	it('renders nothing when disabled prop is true', () => {
		const wrapper = mount(CnFeaturesAndRoadmapLink, {
			...mountOpts,
			propsData: { disabled: true },
		})
		expect(wrapper.findComponent(NcAppNavigationItemStub).exists()).toBe(false)
		expect(wrapper.html()).toBe('')
	})

	it('uses the default localized label when label prop is empty', () => {
		const wrapper = mount(CnFeaturesAndRoadmapLink, mountOpts)
		const item = wrapper.findComponent(NcAppNavigationItemStub)
		// The label resolves via t('nextcloud-vue', 'Features & roadmap').
		// In tests without registerTranslations() the key is returned as-is.
		expect(item.props('name')).toBe('Features & roadmap')
	})

	it('uses a custom label when supplied', () => {
		const wrapper = mount(CnFeaturesAndRoadmapLink, {
			...mountOpts,
			propsData: { label: 'My custom label' },
		})
		const item = wrapper.findComponent(NcAppNavigationItemStub)
		expect(item.props('name')).toBe('My custom label')
	})
})

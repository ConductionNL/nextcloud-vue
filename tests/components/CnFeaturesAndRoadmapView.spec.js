/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnFeaturesAndRoadmapView — the route-level container hosting the
 * Features + Roadmap tabs, the Suggest header button, the SuggestFeatureModal
 * toggle, and the admin-disabled empty state.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnFeaturesAndRoadmapView")
 */

import { mount } from '@vue/test-utils'

import CnFeaturesAndRoadmapView from '../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue'

const stubs = {
	NcButton: { name: 'NcButton', template: '<button class="btn" @click="$emit(\'click\')"><slot /></button>' },
	NcEmptyContent: { name: 'NcEmptyContent', props: ['name', 'description'], template: '<div class="empty"><h2>{{ name }}</h2></div>' },
	LockOutline: true,
	Plus: true,
	CnFeaturesTab: { name: 'CnFeaturesTab', props: ['features'], template: '<div class="features-tab" :data-count="features.length" />' },
	CnRoadmapTab: { name: 'CnRoadmapTab', props: ['repo', 'disabled'], template: '<div class="roadmap-tab" :data-repo="repo" />' },
	CnSuggestFeatureModal: { name: 'CnSuggestFeatureModal', props: ['repo', 'specRef'], template: '<div class="suggest-modal" />' },
}

const baseProps = { repo: 'ConductionNL/openregister', features: [{ slug: 'a', title: 'Alpha' }, { slug: 'b', title: 'Beta' }] }

describe('CnFeaturesAndRoadmapView', () => {
	it('renders both tabs, Features active by default', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		const tabs = wrapper.findAll('.cn-features-and-roadmap-view__tab')
		expect(tabs).toHaveLength(2)
		// The features tab is rendered initially (the active tab).
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(false)
	})

	it('switches to the Roadmap tab when its header button is clicked', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		const tabs = wrapper.findAll('.cn-features-and-roadmap-view__tab')
		await tabs.at(1).trigger('click') // Roadmap tab
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).props('repo')).toBe('ConductionNL/openregister')
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(false)
	})

	it('passes the features prop through to CnFeaturesTab', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).props('features')).toHaveLength(2)
	})

	it('does not render the Suggest modal until the header button is clicked', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)

		// The header Suggest button is the only NcButton at the top.
		await wrapper.find('button.btn').trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).props('repo')).toBe('ConductionNL/openregister')
	})

	it('closes the Suggest modal on its close event', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await wrapper.find('button.btn').trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(true)

		wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).vm.$emit('close')
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
	})

	it('re-emits submitted and switches to the Roadmap tab when the modal reports success', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await wrapper.find('button.btn').trigger('click')

		wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).vm.$emit('submitted', { number: 99 })
		await wrapper.vm.$nextTick()

		expect(wrapper.emitted('submitted')).toBeTruthy()
		expect(wrapper.emitted('submitted')[0][0]).toMatchObject({ number: 99 })
		// View flips to the Roadmap tab so the user sees their just-submitted item land.
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(true)
	})

	it('renders the admin-disabled empty state when disabled is true', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: { ...baseProps, disabled: true } })
		expect(wrapper.findComponent({ name: 'NcEmptyContent' }).exists()).toBe(true)
		expect(wrapper.findAll('.cn-features-and-roadmap-view__tab')).toHaveLength(0)
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(false)
		expect(wrapper.text().toLowerCase()).toContain('disabled by your administrator')
	})

	it('uses Nextcloud CSS variables only (no --nldesign- references)', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.html()).not.toContain('--nldesign-')
	})
})

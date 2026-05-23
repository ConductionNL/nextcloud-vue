/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnFeaturesAndRoadmapView — the route-level container hosting the
 * Features + Roadmap views, the state-aware toggle button, two Suggest CTAs
 * (header + sidebar), the SuggestFeatureModal, the OpenBuilt + LLM sidebar
 * sections, and the admin-disabled empty state.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnFeaturesAndRoadmapView")
 */

import { mount } from '@vue/test-utils'

import CnFeaturesAndRoadmapView from '../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue'

const stubs = {
	NcButton: { name: 'NcButton', template: '<button class="btn" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>' },
	NcEmptyContent: { name: 'NcEmptyContent', props: ['name', 'description'], template: '<div class="empty"><h2>{{ name }}</h2></div>' },
	ArrowRight: true,
	FormatListBulleted: true,
	LockOutline: true,
	OpenInNew: true,
	Plus: true,
	RoadVariant: true,
	CnFeaturesTab: { name: 'CnFeaturesTab', props: ['features'], template: '<div class="features-tab" :data-count="features.length" />' },
	CnRoadmapTab: { name: 'CnRoadmapTab', props: ['repo', 'disabled'], template: '<div class="roadmap-tab" :data-repo="repo" />' },
	CnSuggestFeatureModal: { name: 'CnSuggestFeatureModal', props: ['repo', 'specRef'], template: '<div class="suggest-modal" />' },
}

const baseProps = { repo: 'ConductionNL/openregister', features: [{ slug: 'a', title: 'Alpha' }, { slug: 'b', title: 'Beta' }] }

const headerButtons = (wrapper) => wrapper.findAll('.cn-features-and-roadmap-view__actions button.btn')
const sidebarButtons = (wrapper) => wrapper.findAll('.cn-features-and-roadmap-view__sidebar button.btn')

describe('CnFeaturesAndRoadmapView', () => {
	it('renders the Features view by default', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(false)
		// Page title reflects the active view.
		expect(wrapper.find('.cn-features-and-roadmap-view__title').text()).toBe('Features')
	})

	it('toggles to the Roadmap view when the toggle button is clicked', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		// First header button is the toggle (Show roadmap), second is Suggest feature.
		await headerButtons(wrapper).at(0).trigger('click')
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).props('repo')).toBe('ConductionNL/openregister')
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(false)
		expect(wrapper.find('.cn-features-and-roadmap-view__title').text()).toBe('Roadmap')
	})

	it('toggle button label flips based on the active view', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		const toggle = headerButtons(wrapper).at(0)
		expect(toggle.text()).toContain('Show roadmap')
		await toggle.trigger('click')
		expect(headerButtons(wrapper).at(0).text()).toContain('Show features')
	})

	it('passes the features prop through to CnFeaturesTab', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).props('features')).toHaveLength(2)
	})

	it('opens the Suggest modal from the header CTA', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
		// Header Suggest button is the second action button.
		await headerButtons(wrapper).at(1).trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).props('repo')).toBe('ConductionNL/openregister')
	})

	it('opens the Suggest modal from the sidebar CTA', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await sidebarButtons(wrapper).at(0).trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(true)
	})

	it('closes the Suggest modal on its close event', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await headerButtons(wrapper).at(1).trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(true)

		wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).vm.$emit('close')
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
	})

	it('re-emits submitted and switches to the Roadmap view when the modal reports success', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await headerButtons(wrapper).at(1).trigger('click')

		wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).vm.$emit('submitted', { number: 99 })
		await wrapper.vm.$nextTick()

		expect(wrapper.emitted('submitted')).toBeTruthy()
		expect(wrapper.emitted('submitted')[0][0]).toMatchObject({ number: 99 })
		// View flips to the Roadmap so the user sees their just-submitted item land.
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(true)
	})

	it('renders sidebar OpenBuilt + LLM sections with default link targets', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		const links = wrapper.findAll('.cn-features-and-roadmap-view__sidebar-link')
		expect(links).toHaveLength(2)
		expect(links.at(0).attributes('href')).toContain('/apps/openbuilt')
		expect(links.at(1).attributes('href')).toBe('https://docs.conduction.nl/ai-skills')
		expect(links.at(1).attributes('target')).toBe('_blank')
	})

	it('honors openbuiltUrl + llmSkillsUrl prop overrides', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, {
			stubs,
			propsData: {
				...baseProps,
				openbuiltUrl: 'https://example.com/builder',
				llmSkillsUrl: 'https://example.com/ai',
			},
		})
		const links = wrapper.findAll('.cn-features-and-roadmap-view__sidebar-link')
		expect(links.at(0).attributes('href')).toBe('https://example.com/builder')
		expect(links.at(1).attributes('href')).toBe('https://example.com/ai')
	})

	it('renders the admin-disabled empty state when disabled is true', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: { ...baseProps, disabled: true } })
		expect(wrapper.findComponent({ name: 'NcEmptyContent' }).exists()).toBe(true)
		// Toggle, sidebar, and content all suppressed in the disabled state.
		expect(wrapper.findAll('.cn-features-and-roadmap-view__actions')).toHaveLength(0)
		expect(wrapper.findAll('.cn-features-and-roadmap-view__sidebar')).toHaveLength(0)
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(false)
		expect(wrapper.text().toLowerCase()).toContain('disabled by your administrator')
	})

	it('uses Nextcloud CSS variables only (no --nldesign- references)', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.html()).not.toContain('--nldesign-')
	})
})

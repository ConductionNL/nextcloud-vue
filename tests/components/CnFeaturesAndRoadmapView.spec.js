/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnFeaturesAndRoadmapView — the route-level container hosting the
 * Features + Roadmap card-grid views, the header toggles (view + sidebar +
 * Suggest CTA), the slide-in NcAppSidebar with three pitch sections
 * (Suggest, OpenBuilt, LLM), the Suggest CTA inside the sidebar that opens
 * the same modal, the SuggestFeatureModal lifecycle, and the
 * admin-disabled empty state.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnFeaturesAndRoadmapView")
 */

import { mount } from '@vue/test-utils'

import CnFeaturesAndRoadmapView from '../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue'

const stubs = {
	NcAppSidebar: {
		name: 'NcAppSidebar',
		props: ['name', 'subname', 'empty', 'showTabs'],
		template: '<aside class="cn-features-and-roadmap-view__sidebar" :data-name="name" :data-subname="subname"><slot /></aside>',
	},
	NcButton: { name: 'NcButton', template: '<button class="btn" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>' },
	NcEmptyContent: { name: 'NcEmptyContent', props: ['name', 'description'], template: '<div class="empty"><h2>{{ name }}</h2></div>' },
	ArrowRight: true,
	FormatListBulleted: true,
	InformationOutline: true,
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
const sidebarPanel = (wrapper) => wrapper.findComponent({ name: 'NcAppSidebar' })
const openSidebar = async (wrapper) => {
	// Header buttons order: toggle-view (0), toggle-sidebar (1), Suggest (2).
	await headerButtons(wrapper).at(1).trigger('click')
}

describe('CnFeaturesAndRoadmapView', () => {
	it('renders the Features view by default', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(false)
		expect(wrapper.find('.cn-features-and-roadmap-view__title').text()).toBe('Features')
	})

	it('does NOT render the sidebar until the toggle is clicked', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(sidebarPanel(wrapper).exists()).toBe(false)
		await openSidebar(wrapper)
		expect(sidebarPanel(wrapper).exists()).toBe(true)
		expect(sidebarPanel(wrapper).props('name')).toBe('Shape this app')
		expect(sidebarPanel(wrapper).props('subname')).toBe('Three ways to land a feature')
	})

	it('toggles the sidebar closed when its button is clicked twice', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await openSidebar(wrapper)
		expect(sidebarPanel(wrapper).exists()).toBe(true)
		// Click the sidebar toggle again to close.
		await headerButtons(wrapper).at(1).trigger('click')
		expect(sidebarPanel(wrapper).exists()).toBe(false)
	})

	it('toggles to the Roadmap view when the view-toggle button is clicked', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await headerButtons(wrapper).at(0).trigger('click')
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).props('repo')).toBe('ConductionNL/openregister')
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(false)
		expect(wrapper.find('.cn-features-and-roadmap-view__title').text()).toBe('Roadmap')
	})

	it('view-toggle label flips based on the active view', async () => {
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
		await headerButtons(wrapper).at(2).trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).props('repo')).toBe('ConductionNL/openregister')
	})

	it('opens the Suggest modal from the sidebar text-CTA', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await openSidebar(wrapper)
		// First button inside the sidebar is the Suggest text-CTA.
		const sidebarSuggestBtn = sidebarPanel(wrapper).find('.cn-features-and-roadmap-view__sidebar-link[type="button"]')
		expect(sidebarSuggestBtn.exists()).toBe(true)
		await sidebarSuggestBtn.trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(true)
	})

	it('closes the Suggest modal on its close event', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await headerButtons(wrapper).at(2).trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(true)
		wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).vm.$emit('close')
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
	})

	it('re-emits submitted and switches to the Roadmap view when the modal reports success', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await headerButtons(wrapper).at(2).trigger('click')
		wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).vm.$emit('submitted', { number: 99 })
		await wrapper.vm.$nextTick()
		expect(wrapper.emitted('submitted')).toBeTruthy()
		expect(wrapper.emitted('submitted')[0][0]).toMatchObject({ number: 99 })
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(true)
	})

	it('renders three sidebar sections with default link targets', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await openSidebar(wrapper)
		const sections = sidebarPanel(wrapper).findAll('.cn-features-and-roadmap-view__sidebar-section')
		expect(sections).toHaveLength(3)
		// First section is Suggest with a <button>, the next two are anchors.
		const anchors = sidebarPanel(wrapper).findAll('a.cn-features-and-roadmap-view__sidebar-link')
		expect(anchors).toHaveLength(2)
		expect(anchors.at(0).attributes('href')).toContain('/apps/openbuilt')
		expect(anchors.at(1).attributes('href')).toBe('https://docs.conduction.nl/ai-skills')
		expect(anchors.at(1).attributes('target')).toBe('_blank')
	})

	it('honors openbuiltUrl + llmSkillsUrl prop overrides', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, {
			stubs,
			propsData: {
				...baseProps,
				openbuiltUrl: 'https://example.com/builder',
				llmSkillsUrl: 'https://example.com/ai',
			},
		})
		await openSidebar(wrapper)
		const anchors = sidebarPanel(wrapper).findAll('a.cn-features-and-roadmap-view__sidebar-link')
		expect(anchors.at(0).attributes('href')).toBe('https://example.com/builder')
		expect(anchors.at(1).attributes('href')).toBe('https://example.com/ai')
	})

	it('renders the admin-disabled empty state when disabled is true', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: { ...baseProps, disabled: true } })
		expect(wrapper.findComponent({ name: 'NcEmptyContent' }).exists()).toBe(true)
		expect(wrapper.findAll('.cn-features-and-roadmap-view__actions')).toHaveLength(0)
		expect(sidebarPanel(wrapper).exists()).toBe(false)
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(false)
		expect(wrapper.text().toLowerCase()).toContain('disabled by your administrator')
	})

	it('uses Nextcloud CSS variables only (no --nldesign- references)', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.html()).not.toContain('--nldesign-')
	})
})

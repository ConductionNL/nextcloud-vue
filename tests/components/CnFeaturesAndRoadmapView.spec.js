/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnFeaturesAndRoadmapView — the route-level container hosting the
 * Features + Roadmap card-grid views, the header view-toggle, the primary
 * Suggest-feature CTA, the SuggestFeatureModal lifecycle, and the hoisted
 * sidebar published to `cnIndexSidebarConfig` for CnAppRoot to mount at
 * NcContent level (same mechanism CnIndexPage uses for CnIndexSidebar).
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnFeaturesAndRoadmapView")
 */

import { mount } from '@vue/test-utils'

import CnFeaturesAndRoadmapView from '../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue'

const stubs = {
	NcButton: { name: 'NcButton', template: '<button class="btn" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>' },
	NcEmptyContent: { name: 'NcEmptyContent', props: ['name', 'description'], template: '<div class="empty"><h2>{{ name }}</h2></div>' },
	NcNoteCard: { name: 'NcNoteCard', props: ['type'], template: '<div class="note-card" :data-type="type"><slot /></div>' },
	FormatListBulleted: true,
	LockOutline: true,
	Plus: true,
	RoadVariant: true,
	CnFeaturesTab: { name: 'CnFeaturesTab', props: ['features'], template: '<div class="features-tab" :data-count="features.length" />' },
	CnRoadmapTab: { name: 'CnRoadmapTab', props: ['repo', 'disabled'], template: '<div class="roadmap-tab" :data-repo="repo" />' },
	CnSuggestFeatureModal: { name: 'CnSuggestFeatureModal', props: ['repo', 'specRef'], template: '<div class="suggest-modal" />' },
}

const baseProps = { repo: 'ConductionNL/openregister', features: [{ slug: 'a', title: 'Alpha' }, { slug: 'b', title: 'Beta' }] }

const headerButtons = (wrapper) => wrapper.findAll('.cn-features-and-roadmap-view__actions button.btn')

// Mount with a CnAppRoot-style provide: `cnHostsIndexSidebar=true` +
// a reactive holder mimicking the one CnAppRoot publishes.
const mountWithHost = (extraProps = {}) => {
	const sidebarHolder = { value: null }
	const wrapper = mount(CnFeaturesAndRoadmapView, {
		stubs,
		propsData: { ...baseProps, ...extraProps },
		provide: {
			cnHostsIndexSidebar: true,
			cnIndexSidebarConfig: sidebarHolder,
		},
	})
	return { wrapper, sidebarHolder }
}

describe('CnFeaturesAndRoadmapView', () => {
	it('renders the Features view by default', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(false)
		expect(wrapper.find('.cn-features-and-roadmap-view__title').text()).toBe('Features')
		// Header carries exactly two buttons: view-toggle + Suggest.
		expect(headerButtons(wrapper)).toHaveLength(2)
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

	it('opens the Suggest modal from the header CTA', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
		await headerButtons(wrapper).at(1).trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).props('repo')).toBe('ConductionNL/openregister')
	})

	it('closes the Suggest modal on its close event', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		await headerButtons(wrapper).at(1).trigger('click')
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
		expect(wrapper.findComponent({ name: 'CnRoadmapTab' }).exists()).toBe(true)
	})

	it('publishes the hoisted sidebar config to cnIndexSidebarConfig on mount', () => {
		const { sidebarHolder } = mountWithHost()
		expect(sidebarHolder.value).not.toBe(null)
		expect(sidebarHolder.value.component.name).toBe('CnFeaturesAndRoadmapSidebar')
		expect(sidebarHolder.value.props.openbuiltUrl).toContain('/apps/openbuilt')
		expect(sidebarHolder.value.props.llmSkillsUrl).toBe('https://docs.conduction.nl/ai-skills')
		expect(typeof sidebarHolder.value.listeners.suggest).toBe('function')
	})

	it('honors openbuiltUrl + llmSkillsUrl prop overrides in the published config', () => {
		const { sidebarHolder } = mountWithHost({
			openbuiltUrl: 'https://example.com/builder',
			llmSkillsUrl: 'https://example.com/ai',
		})
		expect(sidebarHolder.value.props.openbuiltUrl).toBe('https://example.com/builder')
		expect(sidebarHolder.value.props.llmSkillsUrl).toBe('https://example.com/ai')
	})

	it('clears the sidebar holder on beforeDestroy', () => {
		const { wrapper, sidebarHolder } = mountWithHost()
		expect(sidebarHolder.value).not.toBe(null)
		wrapper.unmount()
		expect(sidebarHolder.value).toBe(null)
	})

	it('publishes nothing when no CnAppRoot ancestor (cnHostsIndexSidebar=false)', () => {
		const sidebarHolder = { value: null }
		mount(CnFeaturesAndRoadmapView, {
			stubs,
			propsData: baseProps,
			provide: {
				cnHostsIndexSidebar: false,
				cnIndexSidebarConfig: sidebarHolder,
			},
		})
		// View renders the same way but no hoist happens — host gets the
		// untouched holder it provided.
		expect(sidebarHolder.value).toBe(null)
	})

	it('sidebar-published listener opens the Suggest modal when fired', async () => {
		const { wrapper, sidebarHolder } = mountWithHost()
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
		// Fire the listener the sidebar would invoke on its @suggest event.
		sidebarHolder.value.listeners.suggest()
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(true)
	})

	it('does NOT publish the hoisted sidebar when disabled', () => {
		const { sidebarHolder } = mountWithHost({ disabled: true })
		expect(sidebarHolder.value).toBe(null)
	})

	it('renders the admin-disabled empty state when disabled is true', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: { ...baseProps, disabled: true } })
		expect(wrapper.findComponent({ name: 'NcEmptyContent' }).exists()).toBe(true)
		expect(wrapper.findAll('.cn-features-and-roadmap-view__actions')).toHaveLength(0)
		expect(wrapper.findComponent({ name: 'CnFeaturesTab' }).exists()).toBe(false)
		expect(wrapper.text().toLowerCase()).toContain('disabled by your administrator')
	})

	it('uses Nextcloud CSS variables only (no --nldesign- references)', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.html()).not.toContain('--nldesign-')
	})

	it('does NOT render the docs note when documentationUrl is unset', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, { stubs, propsData: baseProps })
		expect(wrapper.find('.cn-features-and-roadmap-view__docs-note').exists()).toBe(false)
	})

	it('renders the docs note above the card grid when documentationUrl is set', () => {
		const wrapper = mount(CnFeaturesAndRoadmapView, {
			stubs,
			propsData: { ...baseProps, documentationUrl: 'https://pipelinq.conduction.nl' },
		})
		const note = wrapper.find('.cn-features-and-roadmap-view__docs-note')
		expect(note.exists()).toBe(true)
		expect(note.attributes('data-type')).toBe('info')
		// Link shows the URL without the scheme prefix for a cleaner label.
		const anchor = note.find('a')
		expect(anchor.attributes('href')).toBe('https://pipelinq.conduction.nl')
		expect(anchor.text()).toBe('pipelinq.conduction.nl')
		expect(anchor.attributes('target')).toBe('_blank')
	})

	it('passes suggestUrl through to the hoisted sidebar config', () => {
		const { sidebarHolder } = mountWithHost({ suggestUrl: 'https://example.com/feedback' })
		expect(sidebarHolder.value.props.suggestUrl).toBe('https://example.com/feedback')
	})
})

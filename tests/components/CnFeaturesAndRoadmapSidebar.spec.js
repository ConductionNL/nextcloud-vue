/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnFeaturesAndRoadmapSidebar — the right-edge sidebar mounted
 * by CnAppRoot via the hoisted `cnIndexSidebarConfig` mechanism.
 */

import { mount } from '@vue/test-utils'

import CnFeaturesAndRoadmapSidebar from '../../src/components/CnFeaturesAndRoadmapSidebar/CnFeaturesAndRoadmapSidebar.vue'

const stubs = { ArrowRight: true, OpenInNew: true }

const baseProps = {
	openbuiltUrl: '/apps/openbuilt',
	llmSkillsUrl: 'https://docs.conduction.nl/ai-skills',
}

describe('CnFeaturesAndRoadmapSidebar', () => {
	it('renders header + three sections', () => {
		const wrapper = mount(CnFeaturesAndRoadmapSidebar, { stubs, propsData: baseProps })
		expect(wrapper.find('.cn-features-and-roadmap-sidebar__name').text()).toBe('Shape this app')
		expect(wrapper.find('.cn-features-and-roadmap-sidebar__subname').text()).toBe('Three ways to land a feature')
		expect(wrapper.findAll('.cn-features-and-roadmap-sidebar__section')).toHaveLength(3)
	})

	it('emits suggest when the Suggest CTA is clicked', async () => {
		const wrapper = mount(CnFeaturesAndRoadmapSidebar, { stubs, propsData: baseProps })
		const suggestBtn = wrapper.find('button.cn-features-and-roadmap-sidebar__link')
		expect(suggestBtn.exists()).toBe(true)
		await suggestBtn.trigger('click')
		expect(wrapper.emitted('suggest')).toBeTruthy()
		expect(wrapper.emitted('suggest')).toHaveLength(1)
	})

	it('renders OpenBuilt + LLM CTAs as anchors with the prop URLs', () => {
		const wrapper = mount(CnFeaturesAndRoadmapSidebar, { stubs, propsData: baseProps })
		const anchors = wrapper.findAll('a.cn-features-and-roadmap-sidebar__link')
		expect(anchors).toHaveLength(2)
		expect(anchors.at(0).attributes('href')).toBe('/apps/openbuilt')
		expect(anchors.at(1).attributes('href')).toBe('https://docs.conduction.nl/ai-skills')
		expect(anchors.at(1).attributes('target')).toBe('_blank')
	})

	it('uses Nextcloud CSS variables only (no --nldesign- references)', () => {
		const wrapper = mount(CnFeaturesAndRoadmapSidebar, { stubs, propsData: baseProps })
		expect(wrapper.html()).not.toContain('--nldesign-')
	})

	it('renders the Suggest CTA as an anchor when suggestUrl is set (internal)', () => {
		const wrapper = mount(CnFeaturesAndRoadmapSidebar, { stubs, propsData: { ...baseProps, suggestUrl: '/apps/forms/internal' } })
		// First sidebar section is the Suggest block.
		const firstSection = wrapper.findAll('.cn-features-and-roadmap-sidebar__section').at(0)
		const anchor = firstSection.find('a.cn-features-and-roadmap-sidebar__link')
		expect(anchor.exists()).toBe(true)
		expect(anchor.attributes('href')).toBe('/apps/forms/internal')
		// Internal URL — no target="_blank"
		expect(anchor.attributes('target')).toBeUndefined()
		// And the button branch is gone.
		expect(firstSection.find('button.cn-features-and-roadmap-sidebar__link').exists()).toBe(false)
	})

	it('renders the Suggest CTA with target=_blank when suggestUrl is external', () => {
		const wrapper = mount(CnFeaturesAndRoadmapSidebar, { stubs, propsData: { ...baseProps, suggestUrl: 'https://example.com/feedback' } })
		const firstSection = wrapper.findAll('.cn-features-and-roadmap-sidebar__section').at(0)
		const anchor = firstSection.find('a.cn-features-and-roadmap-sidebar__link')
		expect(anchor.attributes('href')).toBe('https://example.com/feedback')
		expect(anchor.attributes('target')).toBe('_blank')
		expect(anchor.attributes('rel')).toBe('noopener noreferrer')
	})

	it('does NOT emit suggest when suggestUrl is set (no button to click)', () => {
		const wrapper = mount(CnFeaturesAndRoadmapSidebar, { stubs, propsData: { ...baseProps, suggestUrl: 'https://example.com/feedback' } })
		expect(wrapper.find('button.cn-features-and-roadmap-sidebar__link').exists()).toBe(false)
	})
})

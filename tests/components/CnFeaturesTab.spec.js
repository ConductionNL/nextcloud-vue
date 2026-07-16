/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnFeaturesTab — alphabetically-sorted capability list.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnFeaturesTab")
 */

import { mount } from '@vue/test-utils'

import CnFeaturesTab from '../../src/components/CnFeaturesTab/CnFeaturesTab.vue'

const mountOpts = {
	stubs: {
		NcEmptyContent: {
			name: 'NcEmptyContent',
			props: ['name', 'description'],
			template: '<div class="empty"><h2>{{ name }}</h2><p>{{ description }}</p></div>',
		},
		FileDocumentOutline: true,
		OpenInNew: true,
	},
}

describe('CnFeaturesTab', () => {
	it('renders alphabetically by title (locale-aware, case-insensitive)', () => {
		const wrapper = mount(CnFeaturesTab, {
			...mountOpts,
			propsData: {
				features: [
					{ slug: 'b', title: 'beta' },
					{ slug: 'a', title: 'Alpha' },
					{ slug: 'g', title: 'gamma' },
				],
			},
		})
		const titles = wrapper.findAll('.cn-features-tab__title').wrappers.map((w) => w.text())
		expect(titles).toEqual(['Alpha', 'beta', 'gamma'])
	})

	it('renders an empty state when features is []', () => {
		const wrapper = mount(CnFeaturesTab, { ...mountOpts, propsData: { features: [] } })
		expect(wrapper.findAll('.cn-features-tab__item')).toHaveLength(0)
		expect(wrapper.findComponent({ name: 'NcEmptyContent' }).exists()).toBe(true)
	})

	it('renders docsUrl as an external link with noopener noreferrer', () => {
		const wrapper = mount(CnFeaturesTab, {
			...mountOpts,
			propsData: {
				features: [
					{ slug: 'x', title: 'X', summary: 'Sum', docsUrl: 'https://docs.example.org/x' },
				],
			},
		})
		const link = wrapper.find('a.cn-features-tab__link')
		expect(link.exists()).toBe(true)
		expect(link.attributes('href')).toBe('https://docs.example.org/x')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
	})

	it('does not render the link when docsUrl is absent', () => {
		const wrapper = mount(CnFeaturesTab, {
			...mountOpts,
			propsData: {
				features: [{ slug: 'x', title: 'X', summary: 'Sum' }],
			},
		})
		expect(wrapper.find('a.cn-features-tab__link').exists()).toBe(false)
	})

	it('renders summary when present', () => {
		const wrapper = mount(CnFeaturesTab, {
			...mountOpts,
			propsData: {
				features: [{ slug: 'x', title: 'X', summary: 'A short summary' }],
			},
		})
		expect(wrapper.text()).toContain('A short summary')
	})

	it('uses Nextcloud CSS variables only (no --nldesign- references)', () => {
		const wrapper = mount(CnFeaturesTab, {
			...mountOpts,
			propsData: { features: [{ slug: 'a', title: 'A' }] },
		})
		expect(wrapper.html()).not.toContain('--nldesign-')
	})
})

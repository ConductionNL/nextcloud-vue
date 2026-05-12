/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnRoadmapItem — single roadmap card. The security-critical assertions
 * are (a) the markdown body never renders raw script/iframe/etc. (it flows through
 * cnRenderMarkdown → DOMPurify with SAFE_MARKDOWN_DOMPURIFY_CONFIG) and (b) hydra
 * pipeline labels are filtered out by ROADMAP_LABEL_BLOCKLIST.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnRoadmapItem")
 */

import { mount } from '@vue/test-utils'

import CnRoadmapItem from '../../src/components/CnRoadmapItem/CnRoadmapItem.vue'

const mountOpts = {
	stubs: {
		NcAvatar: { name: 'NcAvatar', props: ['user', 'url', 'size'], template: '<span class="avatar" :data-user="user" />' },
		ThumbUpOutline: true,
	},
}

const baseItem = {
	number: 42,
	title: 'Add GraphQL support',
	body: 'A description.',
	html_url: 'https://github.com/ConductionNL/openregister/issues/42',
	user: { login: 'octocat', avatar_url: 'https://avatars.githubusercontent.com/u/1' },
	reactions: { total_count: 12, '+1': 10 },
	created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
	updated_at: new Date().toISOString(),
	labels: [{ name: 'enhancement', color: 'a2eeef' }],
}

describe('CnRoadmapItem', () => {
	it('renders the title as a link to html_url with noopener noreferrer', () => {
		const wrapper = mount(CnRoadmapItem, { ...mountOpts, propsData: { item: baseItem } })
		const link = wrapper.find('a.cn-roadmap-item__title-link')
		expect(link.exists()).toBe(true)
		expect(link.attributes('href')).toBe(baseItem.html_url)
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
		expect(link.text()).toContain('Add GraphQL support')
	})

	it('renders the +1 reaction count', () => {
		const wrapper = mount(CnRoadmapItem, { ...mountOpts, propsData: { item: baseItem } })
		expect(wrapper.find('.cn-roadmap-item__reactions').text()).toContain('10')
	})

	it('renders the submitter login + avatar', () => {
		const wrapper = mount(CnRoadmapItem, { ...mountOpts, propsData: { item: baseItem } })
		expect(wrapper.text()).toContain('octocat')
		expect(wrapper.findComponent({ name: 'NcAvatar' }).props('user')).toBe('octocat')
	})

	it('strips <script> from the markdown body — no raw script element rendered', () => {
		const item = { ...baseItem, body: '<script>alert(1)</script>Visible part of the body.' }
		const wrapper = mount(CnRoadmapItem, { ...mountOpts, propsData: { item } })
		const html = wrapper.html()
		expect(html).not.toContain('<script')
		expect(html).not.toContain('alert(1)')
		expect(wrapper.text()).toContain('Visible part of the body.')
	})

	it('strips an onerror attribute from an <img> in the body', () => {
		const item = { ...baseItem, body: '<img src="x" onerror="alert(1)"> text after' }
		const wrapper = mount(CnRoadmapItem, { ...mountOpts, propsData: { item } })
		const html = wrapper.html()
		expect(html).not.toContain('onerror')
		expect(html).not.toContain('alert(1)')
	})

	it('renders markdown formatting (bold) from the body', () => {
		const item = { ...baseItem, body: 'This is **bold** text.' }
		const wrapper = mount(CnRoadmapItem, { ...mountOpts, propsData: { item } })
		expect(wrapper.find('.cn-roadmap-item__body').html()).toContain('<strong>bold</strong>')
	})

	it('filters hydra pipeline labels via ROADMAP_LABEL_BLOCKLIST', () => {
		const item = {
			...baseItem,
			labels: [
				{ name: 'enhancement', color: 'a2eeef' },
				{ name: 'build:queued', color: '0075ca' },
				{ name: 'ready-to-build', color: '0e8a16' },
				{ name: 'code-review:running', color: 'fbca04' },
				{ name: 'feature', color: 'a2eeef' },
			],
		}
		const wrapper = mount(CnRoadmapItem, { ...mountOpts, propsData: { item } })
		const chips = wrapper.findAll('.cn-roadmap-item__label-chip').wrappers.map((w) => w.text())
		expect(chips).toContain('enhancement')
		expect(chips).toContain('feature')
		expect(chips).not.toContain('build:queued')
		expect(chips).not.toContain('ready-to-build')
		expect(chips).not.toContain('code-review:running')
	})

	it('does not render the labels footer when all labels are filtered out', () => {
		const item = { ...baseItem, labels: [{ name: 'build:queued' }, { name: 'done' }] }
		const wrapper = mount(CnRoadmapItem, { ...mountOpts, propsData: { item } })
		expect(wrapper.find('.cn-roadmap-item__labels').exists()).toBe(false)
	})

	it('renders an empty body section gracefully when body is empty', () => {
		const item = { ...baseItem, body: '' }
		const wrapper = mount(CnRoadmapItem, { ...mountOpts, propsData: { item } })
		// No body div rendered (v-if guards against empty sanitized output).
		expect(wrapper.find('.cn-roadmap-item__body').exists()).toBe(false)
	})

	it('uses Nextcloud CSS variables only (no --nldesign- references)', () => {
		const wrapper = mount(CnRoadmapItem, { ...mountOpts, propsData: { item: baseItem } })
		expect(wrapper.html()).not.toContain('--nldesign-')
	})
})

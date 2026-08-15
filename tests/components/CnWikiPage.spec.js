/**
 * Tests for CnWikiPage.
 *
 * Covers REQ-MWPT-* (manifest-wiki-page-type):
 *   - Title rendering via `titleField` (default + override).
 *   - Markdown body rendering via `cnRenderMarkdown` (default + override).
 *   - Empty-state when `article` is null.
 *   - Empty-body fallback when the article has no `contentField`.
 *   - Sidebar tree shows only when `sidebarSchema` is set AND `tree`
 *     is non-empty.
 *   - Tree-click event re-emit.
 *   - `#body`, `#header`, `#sidebar`, `#empty` slot overrides.
 */

import { mount } from '@vue/test-utils'
import CnWikiPage from '@/components/CnWikiPage/CnWikiPage.vue'

const stubs = {
	NcEmptyContent: {
		template: '<div class="nc-empty-content-stub"><slot name="icon" /></div>',
		props: ['name', 'description'],
	},
	FileDocumentOutline: {
		template: '<span class="icon-stub" />',
		props: ['size'],
	},
}

describe('CnWikiPage', () => {
	it('renders the article title via the default titleField', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'Onboarding', body: 'Hello' },
			},
			stubs,
		})
		expect(wrapper.find('.cn-wiki-page__title').text()).toBe('Onboarding')
	})

	it('renders the title from a custom titleField', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { name: 'Welcome', body: '...' },
				titleField: 'name',
			},
			stubs,
		})
		expect(wrapper.find('.cn-wiki-page__title').text()).toBe('Welcome')
	})

	it('renders the markdown body via cnRenderMarkdown', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'Doc', body: '# Hello\n\nWorld' },
			},
			stubs,
		})
		const body = wrapper.find('.cn-wiki-page__body')
		expect(body.exists()).toBe(true)
		expect(body.html()).toContain('<h1>Hello</h1>')
		expect(body.html()).toContain('<p>World</p>')
	})

	it('reads the body from a custom contentField', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'Doc', markdown: '## Heading' },
				contentField: 'markdown',
			},
			stubs,
		})
		expect(wrapper.find('.cn-wiki-page__body').html()).toContain('<h2>Heading</h2>')
	})

	it('shows the empty-state when article is null', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: { article: null },
			stubs,
		})
		expect(wrapper.find('.nc-empty-content-stub').exists()).toBe(true)
		expect(wrapper.find('.cn-wiki-page__body').exists()).toBe(false)
	})

	it('shows the empty-body placeholder when the article has no body', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'Stub' },
			},
			stubs,
		})
		// Empty body falls through to the body-empty NcEmptyContent stub
		// (NOT the article-not-found one — the title still renders).
		expect(wrapper.find('.cn-wiki-page__title').text()).toBe('Stub')
		expect(wrapper.find('.nc-empty-content-stub').exists()).toBe(true)
		expect(wrapper.find('.cn-wiki-page__body').exists()).toBe(false)
	})

	it('renders the sidebar when tree is non-empty and sidebarSchema is set', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'A', body: 'x' },
				sidebarSchema: 'category',
				tree: [{ id: '1', title: 'Onboarding' }],
			},
			stubs,
		})
		const sidebar = wrapper.find('.cn-wiki-page__sidebar')
		expect(sidebar.exists()).toBe(true)
		expect(sidebar.text()).toContain('Onboarding')
	})

	it('omits the sidebar when tree is empty', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'A', body: 'x' },
				sidebarSchema: 'category',
				tree: [],
			},
			stubs,
		})
		expect(wrapper.find('.cn-wiki-page__sidebar').exists()).toBe(false)
	})

	it('omits the sidebar when sidebarSchema is unset (even if tree has items)', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'A', body: 'x' },
				tree: [{ id: '1', title: 'Anything' }],
			},
			stubs,
		})
		expect(wrapper.find('.cn-wiki-page__sidebar').exists()).toBe(false)
	})

	it('emits @tree-click with the clicked node', async () => {
		const node = { id: 'x', title: 'X' }
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'A', body: 'x' },
				sidebarSchema: 'category',
				tree: [node],
			},
			stubs,
		})
		await wrapper.find('.cn-wiki-tree-node__button').trigger('click')
		expect(wrapper.emitted('tree-click')).toBeTruthy()
		expect(wrapper.emitted('tree-click')[0][0]).toEqual(node)
	})

	it('emits @tree-click with the leaf node when a nested child is clicked', async () => {
		const child = { id: 'c1', title: 'Child' }
		const root = { id: 'r1', title: 'Root', children: [child] }
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'A', body: 'x' },
				sidebarSchema: 'category',
				tree: [root],
			},
			stubs,
		})
		// Two buttons: root and child. Click the second (the child).
		const buttons = wrapper.findAll('.cn-wiki-tree-node__button')
		await buttons.at(1).trigger('click')
		expect(wrapper.emitted('tree-click')[0][0]).toEqual(child)
	})

	it('honours the #body slot override', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'A', body: '# Test' },
			},
			stubs,
			scopedSlots: {
				body: '<div class="custom-body">CUSTOM</div>',
			},
		})
		expect(wrapper.find('.custom-body').exists()).toBe(true)
		expect(wrapper.find('.cn-wiki-page__body').exists()).toBe(false)
	})

	it('honours the #header slot override', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'Onboarding', body: 'x' },
			},
			stubs,
			scopedSlots: {
				header: '<div class="custom-header">Custom Wiki Header</div>',
			},
		})
		expect(wrapper.find('.custom-header').exists()).toBe(true)
		expect(wrapper.find('.cn-wiki-page__header').exists()).toBe(false)
	})

	it('honours the #sidebar slot override', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: {
				article: { title: 'A', body: 'x' },
				sidebarSchema: 'category',
				tree: [{ id: '1', title: 'X' }],
			},
			stubs,
			scopedSlots: {
				sidebar: '<aside class="custom-sidebar">CUSTOM</aside>',
			},
		})
		expect(wrapper.find('.custom-sidebar').exists()).toBe(true)
		expect(wrapper.find('.cn-wiki-page__sidebar').exists()).toBe(false)
	})

	it('honours the #empty slot override', () => {
		const wrapper = mount(CnWikiPage, {
			propsData: { article: null },
			stubs,
			scopedSlots: {
				empty: '<div class="custom-empty">No article</div>',
			},
		})
		expect(wrapper.find('.custom-empty').exists()).toBe(true)
	})
})

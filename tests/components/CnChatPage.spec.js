/**
 * Tests for CnChatPage.
 *
 * Covers Phase 4: empty state, populated (iframe) state, header/actions
 * slot override, conversation slot replacement.
 */

import { mount } from '@vue/test-utils'
import CnChatPage from '@/components/CnChatPage/CnChatPage.vue'

const stubs = {
	CnPageHeader: {
		template: '<div class="cn-page-header-stub" />',
		props: ['title', 'description', 'icon'],
	},
}

describe('CnChatPage', () => {
	it('renders empty-state when no conversationSource', () => {
		const wrapper = mount(CnChatPage, { stubs })
		expect(wrapper.find('.cn-chat-page__placeholder').exists()).toBe(true)
		expect(wrapper.find('iframe').exists()).toBe(false)
	})

	it('renders an <iframe> with the configured src (populated state)', () => {
		const wrapper = mount(CnChatPage, {
			propsData: { conversationSource: '/talk/abc' },
			stubs,
		})
		const iframe = wrapper.find('iframe')
		expect(iframe.exists()).toBe(true)
		expect(iframe.attributes('src')).toBe('/talk/abc')
	})

	it('default sandbox is restrictive but permits NC Talk same-origin', () => {
		const wrapper = mount(CnChatPage, { propsData: { conversationSource: '/x' }, stubs })
		const sandbox = wrapper.find('iframe').attributes('sandbox')
		expect(sandbox).toContain('allow-same-origin')
		expect(sandbox).toContain('allow-scripts')
	})

	it('honours the #header slot override (mirrors headerComponent dispatch)', () => {
		const wrapper = mount(CnChatPage, {
			propsData: { conversationSource: '/x' },
			stubs,
			scopedSlots: { header: '<div class="custom-header">Custom Chat Header</div>' },
		})
		expect(wrapper.find('.custom-header').exists()).toBe(true)
	})

	it('honours the #actions slot override (mirrors actionsComponent dispatch)', () => {
		const wrapper = mount(CnChatPage, {
			propsData: { conversationSource: '/x' },
			stubs,
			slots: { actions: '<button class="custom-action">Open</button>' },
		})
		expect(wrapper.find('.cn-chat-page__actions').exists()).toBe(true)
		expect(wrapper.find('.custom-action').exists()).toBe(true)
	})

	it('honours the #conversation slot override entirely replacing the iframe', () => {
		const wrapper = mount(CnChatPage, {
			propsData: { conversationSource: '/x' },
			stubs,
			scopedSlots: {
				conversation: '<div class="my-thread">Native thread</div>',
			},
		})
		expect(wrapper.find('iframe').exists()).toBe(false)
		expect(wrapper.find('.my-thread').exists()).toBe(true)
	})

	it('passes conversationSource/postUrl/schema to the #conversation slot scope', () => {
		const wrapper = mount(CnChatPage, {
			propsData: { conversationSource: '/c', postUrl: '/p', schema: 'conversation' },
			stubs,
			scopedSlots: {
				conversation: '<div class="my-thread">{{ props.conversationSource }}|{{ props.postUrl }}|{{ props.schema }}</div>',
			},
		})
		expect(wrapper.find('.my-thread').text()).toBe('/c|/p|conversation')
	})
})

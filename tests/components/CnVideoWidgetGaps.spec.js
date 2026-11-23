/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The CnVideoWidget gaps launchpad's video specs hit: a looping YouTube video
 * carries playlist=<id>, a portrait ratio in a landscape cell is fitted by
 * its height, and the empty state explains itself and, for an editor, offers
 * "Configure now" (REQ-VID-008, REQ-VID-009, REQ-VID-011).
 */

import { mount } from '@vue/test-utils'
import CnVideoWidget from '@/components/CnVideoWidget/CnVideoWidget.vue'

const youtube = (extra = {}) => ({ sourceType: 'youtube', videoUrl: 'https://www.youtube.com/embed/ABC123', ...extra })

describe('CnVideoWidget loop', () => {
	it('adds loop=1&playlist=<id> to a looping YouTube embed', () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: youtube({ loop: true, muted: false }) } })
		const src = new URL(wrapper.find('iframe').attributes('src'))
		expect(src.searchParams.get('loop')).toBe('1')
		expect(src.searchParams.get('playlist')).toBe('ABC123')
	})

	it('keeps an existing start offset and adds no playlist without loop', () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: youtube({ videoUrl: 'https://www.youtube.com/embed/ABC123?start=120' }) } })
		const src = new URL(wrapper.find('iframe').attributes('src'))
		expect(src.searchParams.get('start')).toBe('120')
		expect(src.searchParams.has('playlist')).toBe(false)
	})

	it('adds no playlist to a looping Vimeo embed', () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: { sourceType: 'vimeo', videoUrl: 'https://player.vimeo.com/video/12345', loop: true } } })
		const src = new URL(wrapper.find('iframe').attributes('src'))
		expect(src.searchParams.get('loop')).toBe('1')
		expect(src.searchParams.has('playlist')).toBe(false)
	})
})

describe('CnVideoWidget aspect ratio in its cell', () => {
	it('fits a 9:16 video by the height of a landscape cell', async () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: youtube({ aspectRatio: '9:16' }) } })
		wrapper.vm.box = { width: 600, height: 320 }
		await wrapper.vm.$nextTick()
		const style = wrapper.find('.cn-video-widget__media').attributes('style')
		expect(style).toContain('width: 180px')
		expect(style).toContain('aspect-ratio: 9 / 16')
	})

	it('fills the width when the cell is narrower than the ratio', async () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: youtube({ aspectRatio: '16:9' }) } })
		wrapper.vm.box = { width: 320, height: 600 }
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-video-widget__media').attributes('style')).toContain('width: 100%')
	})
})

describe('CnVideoWidget empty state', () => {
	it('explains how to add a video, without a configure button for a viewer', () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: {} } })
		expect(wrapper.find('.cn-video-widget__placeholder-help').text()).toBe('Edit the widget to add a video')
		expect(wrapper.find('.cn-video-widget__configure').exists()).toBe(false)
	})

	it('offers "Configure now" to an editor, which asks the host to edit', async () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: {}, canEdit: true } })
		const button = wrapper.find('.cn-video-widget__configure')
		expect(button.text()).toBe('Configure now')
		await button.trigger('click')
		expect(wrapper.emitted('edit')).toHaveLength(1)
	})
})

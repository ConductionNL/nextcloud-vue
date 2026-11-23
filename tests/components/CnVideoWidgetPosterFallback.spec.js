/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A poster URL that does not load falls back to a video icon over the
 * video, not to the error state (REQ-VID poster-image-fallback).
 */
import { mount } from '@vue/test-utils'
import CnVideoWidget from '@/components/CnVideoWidget/CnVideoWidget.vue'

const probes = []
class FakeImage {
	constructor() {
		probes.push(this)
	}
}

const content = (posterUrl) => ({ sourceType: 'nc-file', fileId: 7, fileStreamingUrl: '/remote.php/dav/files/a/clip.mp4', posterUrl })

describe('CnVideoWidget poster fallback', () => {
	let RealImage
	beforeEach(() => {
		RealImage = global.Image
		global.Image = FakeImage
		probes.length = 0
	})
	afterEach(() => {
		global.Image = RealImage
	})

	it('uses a poster that loads and shows no icon', async () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: content('/poster.png') } })
		expect(probes[0].src).toBe('/poster.png')
		probes[0].onload?.()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('video').attributes('poster')).toBe('/poster.png')
		expect(wrapper.find('.cn-video-widget__poster-fallback').exists()).toBe(false)
	})

	it('swaps a broken poster for a video icon over the video, not an error', async () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: content('/missing.png') } })
		probes[0].onerror()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('video').exists()).toBe(true)
		expect(wrapper.find('video').attributes('poster')).toBeUndefined()
		expect(wrapper.find('.cn-video-widget__poster-fallback .video-icon').exists()).toBe(true)
		expect(wrapper.find('.cn-video-widget__placeholder').exists()).toBe(false)

		await wrapper.find('video').trigger('play')
		expect(wrapper.find('.cn-video-widget__poster-fallback').exists()).toBe(false)
	})

	it('re-arms when the poster URL changes', async () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: content('/missing.png') } })
		probes[0].onerror()
		await wrapper.setProps({ content: content('/other.png') })
		expect(wrapper.vm.posterFailed).toBe(false)
		expect(probes[1].src).toBe('/other.png')
	})
})

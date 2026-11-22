/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The image widget's placeholder is the camera glyph (REQ-IMG-002) and a
 * linked cell opens its link with window.open(link, '_blank',
 * 'noopener,noreferrer') (REQ-IMG-003).
 */
import { mount } from '@vue/test-utils'
import CnImageWidget from '@/components/CnImageWidget/CnImageWidget.vue'

describe('CnImageWidget', () => {
	let open
	beforeEach(() => {
		open = jest.spyOn(window, 'open').mockImplementation(() => null)
	})
	afterEach(() => open.mockRestore())

	it('draws the 48px camera glyph when there is no image', () => {
		const svg = mount(CnImageWidget, { propsData: { content: { url: '' } } }).find('.cn-image-widget__placeholder .camera-icon svg')
		expect(svg.exists()).toBe(true)
		expect(svg.attributes('width')).toBe('48')
	})

	it('opens a linked cell with window.open and no opener', async () => {
		const wrapper = mount(CnImageWidget, { propsData: { content: { url: '/a.png', link: 'https://example.com' } } })
		await wrapper.trigger('click')
		expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer')
	})

	it('leaves a modified click to the anchor and opens nothing for an unsafe or missing link', async () => {
		const linked = mount(CnImageWidget, { propsData: { content: { url: '/a.png', link: 'https://example.com' } } })
		await linked.trigger('click', { ctrlKey: true })
		const unsafe = mount(CnImageWidget, { propsData: { content: { url: '/a.png', link: 'javascript:alert(1)' } } })
		await unsafe.trigger('click')
		const plain = mount(CnImageWidget, { propsData: { content: { url: '/a.png' } } })
		await plain.trigger('click')
		expect(open).not.toHaveBeenCalled()
	})
})

/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * On a detail page the markdown and image widgets can show a field of the
 * record (`content.field`), so an article reads as its reader sees it
 * without a component of its own.
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
	imagePath: jest.fn((app, file) => `/nc/apps/${app}/img/${file}`),
}))
import CnImageWidget from '../../src/components/CnImageWidget/CnImageWidget.vue'
import CnMarkdownWidget from '../../src/components/CnMarkdownWidget/CnMarkdownWidget.vue'

const article = { id: 'a-1', body: '# Opening hours\n\nWe are open **daily**.', heroImage: 'https://example.org/hero.jpg', title: 'Opening hours', meta: { summary: 'Short' } }

describe('CnMarkdownWidget: content.field', () => {
	it('renders the field of the record it is handed', () => {
		const wrapper = mount(CnMarkdownWidget, { propsData: { content: { field: 'body' }, objectData: article } })
		expect(wrapper.find('h1').text()).toBe('Opening hours')
		expect(wrapper.find('strong').text()).toBe('daily')
	})

	it('reads the record from the injected detail context, by dot path', () => {
		const wrapper = mount(CnMarkdownWidget, {
			propsData: { content: { field: 'meta.summary' } },
			provide: { cnObjectContext: { value: { object: article } } },
		})
		expect(wrapper.text()).toBe('Short')
	})

	it('keeps static markdown when no field is named', () => {
		const wrapper = mount(CnMarkdownWidget, { propsData: { content: { markdown: 'Plain' }, objectData: article } })
		expect(wrapper.text()).toBe('Plain')
	})
})

describe('CnImageWidget: content.field', () => {
	it('shows the image the record names, with the alt text from another field', () => {
		const wrapper = mount(CnImageWidget, { propsData: { content: { field: 'heroImage', altField: 'title' }, objectData: article } })
		const img = wrapper.find('img')
		expect(img.attributes('src')).toBe('https://example.org/hero.jpg')
		expect(img.attributes('alt')).toBe('Opening hours')
	})

	it('shows a Files path through the Nextcloud preview', () => {
		const wrapper = mount(CnImageWidget, { propsData: { content: { field: 'heroImage' }, objectData: { heroImage: '/Marketing/hero image.jpg' } } })
		expect(wrapper.find('img').attributes('src')).toBe('/nc/core/preview.png?file=%2FMarketing%2Fhero%20image.jpg&x=1200&y=630&a=1')
	})

	it('shows the placeholder when the record has no image', () => {
		const wrapper = mount(CnImageWidget, { propsData: { content: { field: 'heroImage' }, objectData: { id: 'a-2' } } })
		expect(wrapper.find('img').exists()).toBe(false)
	})
})

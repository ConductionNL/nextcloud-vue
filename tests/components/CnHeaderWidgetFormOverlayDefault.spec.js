/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An overlay mode nobody chose is stored as no value, so the renderer's
 * documented default applies: `tint` over a background image, `none` without
 * one (launchpad header-widget, "overlayMode defaults to tint when an image is
 * present"). A stored `"none"` used to switch the tint off for every image.
 */

import { mount } from '@vue/test-utils'
import CnHeaderWidget from '@/components/CnHeaderWidget/CnHeaderWidget.vue'
import CnHeaderWidgetForm from '@/components/CnHeaderWidgetForm/CnHeaderWidgetForm.vue'
import { getDefaultContent } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '@/components/CnHeaderWidget/index.js'

describe('CnHeaderWidgetForm overlay default', () => {
	it('stores no overlayMode until one is chosen', () => {
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { value: { title: 'Hello' } } })
		wrapper.vm.updateField('title', 'Hi')
		const content = wrapper.emitted('update:content').at(-1)[0]
		expect(content).not.toHaveProperty('overlayMode')
	})

	it('shows the renderer default in the form: none without an image, tint with one', async () => {
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { value: { title: 'Hello' } } })
		expect(wrapper.vm.effectiveOverlayMode).toBe('none')
		wrapper.vm.updateField('backgroundImageUrl', 'https://example.com/a.png')
		expect(wrapper.vm.effectiveOverlayMode).toBe('tint')
		expect(wrapper.emitted('update:content').at(-1)[0]).not.toHaveProperty('overlayMode')
	})

	it('stores a mode the user chose, including none', () => {
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { value: { title: 'Hello', backgroundImageUrl: 'https://example.com/a.png' } } })
		wrapper.vm.updateField('overlayMode', 'none')
		expect(wrapper.emitted('update:content').at(-1)[0].overlayMode).toBe('none')
	})

	it('keeps a stored overlayMode as it was', () => {
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { value: { title: 'Hello', overlayMode: 'gradient-bottom' } } })
		wrapper.vm.updateField('title', 'Hi')
		expect(wrapper.emitted('update:content').at(-1)[0].overlayMode).toBe('gradient-bottom')
	})

	it('registers no overlayMode in the header type\'s default content', () => {
		expect(getDefaultContent('header')).not.toHaveProperty('overlayMode')
	})

	it('renders the tint over an image when the stored content has no mode', () => {
		const wrapper = mount(CnHeaderWidget, { propsData: { content: { title: 'Hello', backgroundImageUrl: 'https://example.com/a.png' } } })
		expect(wrapper.vm.overlayMode).toBe('tint')
	})
})

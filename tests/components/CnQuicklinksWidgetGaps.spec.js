import { mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnQuicklinksWidget rings a hovered link in its own colour, and the form keeps
 * an invalid URL field red while it has focus and refuses script and data URLs.
 */
import fs from 'fs'
import path from 'path'
import CnQuicklinksWidget from '@/components/CnQuicklinksWidget/CnQuicklinksWidget.vue'
import CnQuicklinksWidgetForm from '@/components/CnQuicklinksWidgetForm/CnQuicklinksWidgetForm.vue'

const dir = path.join(__dirname, '../../src/components')
const widgetSource = fs.readFileSync(path.join(dir, 'CnQuicklinksWidget/CnQuicklinksWidget.vue'), 'utf8')
const formSource = fs.readFileSync(path.join(dir, 'CnQuicklinksWidgetForm/CnQuicklinksWidgetForm.vue'), 'utf8')

describe('CnQuicklinksWidget border hover', () => {
	it('hands each link its colour as a custom property', () => {
		const wrapper = mount(CnQuicklinksWidget, {
			propsData: {
				content: {
					hoverEffect: 'border',
					links: [
						{ label: 'Red', url: 'https://example.com/red', icon: 'Star', color: '#ff0000' },
						{ label: 'Plain', url: 'https://example.com/plain', icon: 'Star' },
					],
				},
			},
		})
		const links = wrapper.findAll('.cn-quicklinks-widget__link')
		expect(links[0].element.style.getPropertyValue('--cn-quicklinks-link-color')).toBe('#ff0000')
		expect(links[1].element.style.getPropertyValue('--cn-quicklinks-link-color')).toBe('')
	})

	it('draws the hover ring in the link colour, else the primary colour', () => {
		const rule = widgetSource.match(/--hover-border \.cn-quicklinks-widget__link:hover \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('var(--cn-quicklinks-link-color, var(--color-primary))')
	})
})

describe('CnQuicklinksWidgetForm URL errors', () => {
	it('keeps the error border on a focused invalid field', () => {
		const rule = formSource.match(/([^{}]*)\{\s*border-color: var\(--color-error, #d32f2f\) !important;/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('.cn-quicklinks-widget-form__input--invalid:focus')
	})

	it.each(['javascript:void(0)', 'javascript:alert("xss")', 'data:text/html,<img src=x onerror=alert(1)>'])('flags and refuses %s', async (url) => {
		const wrapper = mount(CnQuicklinksWidgetForm, {
			propsData: { value: { links: [{ label: 'Danger', url, icon: '' }] } },
		})
		expect(wrapper.find('.cn-quicklinks-widget-form__input--invalid').exists()).toBe(true)
		expect(wrapper.find('.cn-quicklinks-widget-form__inline-error').text()).toBe('Invalid URL')
		expect(wrapper.vm.validate()).toEqual(['Invalid URL in one or more links'])
	})
})

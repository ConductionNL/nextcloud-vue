/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnLinksWidget and CnLinksWidgetForm: image alt text, the link-glyph
 * fallback, rel for internal new-tab links, the columns notice, a single
 * `../` step, and an empty new section.
 */
import { mount } from '@vue/test-utils'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import CnLinksWidget from '@/components/CnLinksWidget/CnLinksWidget.vue'
import CnLinksWidgetForm from '@/components/CnLinksWidgetForm/CnLinksWidgetForm.vue'
import { isSafeRelativePath } from '@/utils/widgetUrl.js'

/**
 * Mount the renderer with one section holding the given links.
 *
 * @param {object[]} links The links.
 * @param {object} [extra] Extra content fields.
 * @return {object} The wrapper.
 */
function renderLinks(links, extra = {}) {
	return mount(CnLinksWidget, {
		propsData: { content: { sections: [{ title: 'S', links }], ...extra } },
	})
}

describe('CnLinksWidget icons', () => {
	it('gives an image icon the link label as alt text', () => {
		const wrapper = renderLinks([{ label: 'Custom', url: 'https://example.com', icon: 'https://example.com/logo.png' }])
		expect(wrapper.find('.cn-links-widget__icon-wrap img').attributes('alt')).toBe('Custom')
	})

	it.each([[''], ['not-a-real-icon-name']])('draws the link glyph for icon %j', (icon) => {
		const wrapper = renderLinks([{ label: 'Doc', url: '/docs/readme.pdf', icon }])
		const wrap = wrapper.find('.cn-links-widget__icon-wrap')
		expect(wrap.findComponent(LinkVariant).exists()).toBe(true)
		expect(wrap.findComponent(HelpCircleOutline).exists()).toBe(false)
	})
})

describe('CnLinksWidget rel', () => {
	it('lets an internal new-tab link keep window.opener', () => {
		const a = renderLinks([{ label: 'Internal', url: '/apps/files' }], { openInNewTab: true }).find('a')
		expect(a.attributes('target')).toBe('_blank')
		expect(a.attributes('rel')).toBe('opener')
	})

	it('keeps noopener noreferrer on an external new-tab link', () => {
		const a = renderLinks([{ label: 'Ext', url: 'https://example.com' }], { openInNewTab: true }).find('a')
		expect(a.attributes('rel')).toBe('noopener noreferrer')
	})

	it('renders a single ../ step as its href', () => {
		const a = renderLinks([{ label: 'Up', url: '../other' }]).find('a')
		expect(a.attributes('href')).toBe('../other')
	})
})

describe('isSafeRelativePath', () => {
	it('accepts a root-relative path and one ../ step, refuses a chain', () => {
		expect(isSafeRelativePath('/apps/files/list')).toBe(true)
		expect(isSafeRelativePath('../other')).toBe(true)
		expect(isSafeRelativePath('../../../etc/passwd')).toBe(false)
		expect(isSafeRelativePath('/apps/../etc')).toBe(false)
		expect(isSafeRelativePath('other')).toBe(false)
	})
})

describe('CnLinksWidgetForm', () => {
	it('starts a new section with no link rows', () => {
		const wrapper = mount(CnLinksWidgetForm)
		wrapper.vm.addSection()
		expect(wrapper.vm.sections[0].links).toEqual([])
	})

	it('accepts a single ../ step and refuses a ../ chain', () => {
		const wrapper = mount(CnLinksWidgetForm, {
			propsData: { value: { sections: [{ title: 'S', links: [{ label: 'T', url: '../other' }] }] } },
		})
		expect(wrapper.vm.validate()).toEqual([])
		wrapper.vm.updateLink(0, 0, 'url', '../../../etc/passwd')
		expect(wrapper.vm.validate().length).toBe(1)
	})

	it('clamps 7 columns to 6 and says so', async () => {
		const wrapper = mount(CnLinksWidgetForm)
		const input = wrapper.find('input[type="number"]')
		await input.setValue('7')
		expect(input.element.value).toBe('6')
		expect(wrapper.vm.columns).toBe(6)
		const notice = wrapper.find('.cn-links-form__notice')
		expect(notice.exists()).toBe(true)
		expect(notice.attributes('role')).toBe('alert')
		expect(notice.text()).toContain('7')

		await input.setValue('4')
		expect(wrapper.vm.columns).toBe(4)
		expect(wrapper.find('.cn-links-form__notice').exists()).toBe(false)
	})
})

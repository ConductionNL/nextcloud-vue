/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIcon (and CnWidgetIcon, which defers to it) resolves the name forms a
 * widget config is written in: lowercase or kebab-case MDI names and concepts
 * of the semantic vocabulary, besides the exact PascalCase name.
 */
import { mount } from '@vue/test-utils'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import CnIcon, { resolveIcon } from '../../src/components/CnIcon/CnIcon.vue'
import CnQuicklinksWidget from '../../src/components/CnQuicklinksWidget/CnQuicklinksWidget.vue'
import CnWidgetIcon from '../../src/components/CnWidgetGrid/CnWidgetIcon.vue'
import { mdiIcon } from '../../src/components/CnIcon/mdiIcon.js'

// The lookup tables hold mdiIcon() components (same DOM as the package SFCs).
const Calendar = mdiIcon('Calendar')
const FolderOutline = mdiIcon('FolderOutline')
const LinkVariant = mdiIcon('LinkVariant')

/**
 * Mount CnIcon and read the component it resolved.
 *
 * @param {string} name The icon name.
 * @param {string} [fallback] The fallback name.
 * @return {object} The resolved component.
 */
function resolve(name, fallback) {
	const propsData = fallback === undefined ? { name } : { name, fallback }
	return mount(CnIcon, { propsData }).vm.resolvedComponent
}

describe('CnIcon name forms', () => {
	it('resolves a lowercase MDI name to its PascalCase icon', () => {
		expect(resolve('calendar')).toBe(Calendar)
	})

	it('resolves a kebab-case MDI name', () => {
		expect(resolve('link-variant')).toBe(LinkVariant)
	})

	it('resolves a semantic concept to its vocabulary icon', () => {
		expect(resolve('folder')).toBe(FolderOutline)
	})

	it('resolves Link, which no registry holds, through the link concept', () => {
		expect(resolve('Link')).toBe(LinkVariant)
	})

	it('resolves the fallback name the same way', () => {
		expect(resolve('not-a-real-icon-name', 'LinkVariant')).toBe(LinkVariant)
		expect(resolve('', 'link')).toBe(LinkVariant)
	})

	it('still falls back to the help circle for junk and prototype keys', () => {
		expect(resolve('not-a-real-icon-name')).toBe(HelpCircleOutline)
		expect(resolveIcon('constructor')).toBeNull()
		expect(resolveIcon('toString')).toBeNull()
		expect(resolveIcon(null)).toBeNull()
	})
})

describe('CnWidgetIcon with a lowercase name', () => {
	it('draws the calendar glyph, not a fallback', () => {
		const wrapper = mount(CnWidgetIcon, { propsData: { name: 'calendar', size: 64 } })
		expect(wrapper.findComponent(Calendar).exists()).toBe(true)
		expect(wrapper.findComponent(HelpCircleOutline).exists()).toBe(false)
	})
})

describe('CnQuicklinksWidget empty icon', () => {
	it('draws the link glyph for a link without an icon', () => {
		const wrapper = mount(CnQuicklinksWidget, {
			propsData: { content: { links: [{ label: 'Quick link', url: 'https://example.com', icon: '' }] } },
		})
		const icon = wrapper.find('.cn-quicklinks-widget__icon')
		expect(icon.findComponent(LinkVariant).exists()).toBe(true)
		expect(icon.findComponent(HelpCircleOutline).exists()).toBe(false)
	})
})

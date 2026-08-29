/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnWidgetWrapper's coloured header icon and its placement.
 *
 * Two defects from the widget review, both about the same three lines of
 * markup:
 *
 * 1. Only widgets whose app remembered to pass `titleIconColor` had a
 *    coloured icon. OpenCatalogi's did (orange Concepts, green Published, red
 *    Depublished) and everyone else's were grey. Colour is now the default,
 *    from `titleIconVariant`, with `primary` as the resting value.
 * 2. A left-hand title icon sat flush against the title. It was a SIBLING of
 *    the title group inside a `justify-content: space-between` header, so no
 *    gap applied between them — moving it into the header's left group is what
 *    fixes it, and that is a DOM fact this asserts, not a CSS one (jsdom
 *    computes no layout, so asserting the gap directly would prove nothing).
 */

import { mount } from '@vue/test-utils'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

const stubs = {
	CnActionsMenu: { template: '<div class="menu-stub" />' },
}

const mountWrapper = (propsData = {}, opts = {}) => mount(CnWidgetWrapper, {
	propsData: { title: 'Concept Publications', ...propsData },
	stubs,
	...opts,
})

const iconSlot = { 'title-icon': '<span class="my-icon" />' }

describe('CnWidgetWrapper — coloured header icon', () => {
	it('colours the icon with the theme primary by default — no configuration needed', () => {
		const w = mountWrapper({ titleIconPosition: 'left' }, { slots: iconSlot })
		expect(w.vm.titleIconStyle).toEqual({ '--cn-widget-icon-color': 'var(--color-primary-element)' })
	})

	it('takes a semantic variant for a widget whose subject already means something', () => {
		const colour = (v) => mountWrapper({ titleIconVariant: v }).vm.titleIconStyle['--cn-widget-icon-color']
		expect(colour('warning')).toBe('var(--color-warning)')
		expect(colour('success')).toBe('var(--color-success)')
		expect(colour('error')).toBe('var(--color-error)')
	})

	it('lets an explicit titleIconColor win over the variant', () => {
		const w = mountWrapper({ titleIconVariant: 'success', titleIconColor: 'var(--color-error)' })
		expect(w.vm.titleIconStyle['--cn-widget-icon-color']).toBe('var(--color-error)')
	})

	// NL Design System: the nldesign app re-themes by overriding the Nextcloud
	// variables, so every built-in colour has to be one of those variables.
	// A hex here would silently opt every widget icon out of government theming.
	it('resolves every variant to a CSS variable, never a literal', () => {
		for (const v of ['primary', 'success', 'warning', 'error', 'info', 'neutral']) {
			const c = mountWrapper({ titleIconVariant: v }).vm.titleIconStyle['--cn-widget-icon-color']
			expect(c).toMatch(/^var\(--/)
			expect(c).not.toMatch(/#[0-9a-f]{3,6}/i)
		}
	})

	// Declared ONCE on the header, so it cascades to the icon-class span, the
	// title-icon slot's content and any SVG inside it. The alternative —
	// binding an inline `color` onto each icon element — is how an icon and
	// the decoration beside it end up different colours.
	it('publishes the colour as one custom property on the header', () => {
		const w = mountWrapper({ iconClass: 'icon-files', titleIconVariant: 'warning' })
		expect(w.find('.cn-widget-wrapper__header').attributes('style'))
			.toContain('--cn-widget-icon-color: var(--color-warning)')
	})
})

describe('CnWidgetWrapper — icon/title spacing', () => {
	it('puts a left-hand title icon INSIDE the header-left group, beside the title', () => {
		const w = mountWrapper({ titleIconPosition: 'left' }, { slots: iconSlot })
		const left = w.find('.cn-widget-wrapper__header-left')
		expect(left.find('.cn-widget-wrapper__title-icon').exists()).toBe(true)
		expect(left.find('.cn-widget-wrapper__title').exists()).toBe(true)
	})

	// Ordered via the DOM, not via indexOf on the HTML string: the class name
	// `cn-widget-wrapper__title-icon` CONTAINS `cn-widget-wrapper__title`, so
	// a string search finds both at the same offset and the comparison is
	// vacuous — it passed on markup in either order.
	it('renders the icon before the title, in that order', () => {
		const w = mountWrapper({ titleIconPosition: 'left' }, { slots: iconSlot })
		const icon = w.find('.cn-widget-wrapper__title-icon').element
		const title = w.find('.cn-widget-wrapper__title').element
		// eslint-disable-next-line no-bitwise
		expect(icon.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	})

	it('keeps a right-hand title icon outside the left group, after the actions', () => {
		const w = mountWrapper({ titleIconPosition: 'right' }, { slots: iconSlot })
		expect(w.find('.cn-widget-wrapper__header-left .cn-widget-wrapper__title-icon').exists()).toBe(false)
		expect(w.find('.cn-widget-wrapper__header > .cn-widget-wrapper__title-icon').exists()).toBe(true)
	})
})

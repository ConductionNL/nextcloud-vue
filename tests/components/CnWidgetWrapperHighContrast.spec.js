/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget declares high contrast; the theme decides what that looks like.
 *
 * The assertion that matters is the second one: the component must set no
 * colour of its own (ADR-003). A component that declared the flag AND painted
 * itself would look correct on the default theme and fight every other one.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import { shallowMount } from '@vue/test-utils'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

/**
 * Mount a widget wrapper.
 *
 * @param {object} [props] Props to merge in.
 * @return {object} The wrapper.
 */
function mountWidget(props = {}) {
	return shallowMount(CnWidgetWrapper, {
		props: { title: 'Cases this week', ...props },
		global: { stubs: { teleport: true }, mocks: { t: (_app, str) => str } },
	})
}

describe('CnWidgetWrapper — the high contrast flag', () => {
	it('exposes the flag to the theme as a data attribute', () => {
		expect(mountWidget({ highContrast: true }).attributes('data-cn-high-contrast')).toBe('true')
	})

	it('exposes it as a class too, so a theme can hook either', () => {
		expect(mountWidget({ highContrast: true }).classes()).toContain('cn-widget-wrapper--high-contrast')
	})

	it('picks no colour of its own', () => {
		const style = mountWidget({ highContrast: true }).attributes('style') || ''

		expect(style).not.toMatch(/color|background/)
	})

	it('writes no attribute at all when the widget declares nothing', () => {
		const plain = mountWidget()

		expect(plain.attributes('data-cn-high-contrast')).toBeUndefined()
		expect(plain.classes()).not.toContain('cn-widget-wrapper--high-contrast')
	})

	it('renders the same widget either way, so the flag adds nothing but the flag', () => {
		expect(mountWidget({ highContrast: true }).find('.cn-widget-wrapper__title').text())
			.toBe(mountWidget().find('.cn-widget-wrapper__title').text())
	})
})

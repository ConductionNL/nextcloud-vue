/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnHeaderWidget `greetingLine`: the title stays the heading ("Vandaag") and
 * the greeting, the date and the week sit on one line under it (LpVandaag).
 *
 * @spec openspec/changes/header-greeting-line/specs/header-widget/spec.md#requirement-a-header-can-carry-the-greeting-under-its-title
 */

import { getCurrentUser } from '@nextcloud/auth'
import { mount } from '@vue/test-utils'
import CnHeaderWidget, { isoWeek } from '../../src/components/CnHeaderWidget/CnHeaderWidget.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn() }))

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
	getCanonicalLocale: () => 'en-GB',
}))

const MONDAY = new Date(2026, 9, 5, 14, 15)

const LINE = '[data-testid="cn-header-widget-line"]'

beforeEach(() => {
	getCurrentUser.mockReturnValue({ uid: 'pieter', displayName: 'Pieter Jansen' })
})

describe('isoWeek', () => {
	it('numbers the weeks as ISO 8601 does', () => {
		expect(isoWeek(MONDAY)).toBe(41)
		expect(isoWeek(new Date(2026, 0, 1))).toBe(1)
		expect(isoWeek(new Date(2027, 0, 1))).toBe(53)
		expect(isoWeek(new Date(2025, 11, 29))).toBe(1)
	})
})

describe('CnHeaderWidget greetingLine', () => {
	it('keeps the title as the heading and puts greeting, date and week under it', () => {
		const wrapper = mount(CnHeaderWidget, {
			propsData: { content: { title: 'Today', greeting: true, showDate: true, showWeek: true, greetingLine: true, ground: true }, now: MONDAY },
		})
		expect(wrapper.find('h2').text()).toBe('Today')
		expect(wrapper.find(LINE).text()).toBe('Good afternoon, Pieter · Monday, 5 October 2026 · week 41')
		expect(wrapper.find('[data-testid="cn-header-widget-date"]').exists()).toBe(false)
		expect(wrapper.classes()).toContain('cn-header-widget--greeting-line')
	})

	it('leaves out the parts that are off', () => {
		const wrapper = mount(CnHeaderWidget, {
			propsData: { content: { title: 'Today', greeting: true, greetingLine: true }, now: MONDAY },
		})
		expect(wrapper.find(LINE).text()).toBe('Good afternoon, Pieter')
	})

	it('draws the greeting as the heading, as before, without a title', () => {
		const wrapper = mount(CnHeaderWidget, {
			propsData: { content: { greeting: true, showDate: true, greetingLine: true }, now: MONDAY },
		})
		expect(wrapper.find('h2').text()).toBe('Good afternoon, Pieter')
		expect(wrapper.find(LINE).exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-header-widget-date"]').exists()).toBe(true)
	})

	it('changes nothing without the key', () => {
		const wrapper = mount(CnHeaderWidget, {
			propsData: { content: { title: 'Today', subtitle: 'Welcome', greeting: true, showWeek: true }, now: MONDAY },
		})
		expect(wrapper.find('h2').text()).toBe('Good afternoon, Pieter')
		expect(wrapper.find('.cn-header-widget__subtitle').text()).toBe('Welcome')
		expect(wrapper.find(LINE).exists()).toBe(false)
	})
})

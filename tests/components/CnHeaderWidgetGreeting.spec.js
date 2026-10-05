/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnHeaderWidget: the optional greeting, date line and plain presentation.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-greeting-header
 */

import { getCurrentUser } from '@nextcloud/auth'
import { mount } from '@vue/test-utils'
import CnHeaderWidget from '../../src/components/CnHeaderWidget/CnHeaderWidget.vue'
import CnHeaderWidgetForm from '../../src/components/CnHeaderWidgetForm/CnHeaderWidgetForm.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn() }))

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
	getCanonicalLocale: () => 'en-GB',
}))

const at = (hour) => new Date(2026, 9, 5, hour, 15)

/**
 * Mount the header at a fixed moment.
 *
 * @param {object} content The content blob.
 * @param {number} [hour] The hour of the day.
 * @return {object} The wrapper.
 */
function mountHeader(content, hour = 14) {
	return mount(CnHeaderWidget, { propsData: { content, now: at(hour) } })
}

beforeEach(() => {
	getCurrentUser.mockReturnValue({ uid: 'pieter', displayName: 'Pieter de Vries' })
})

describe('CnHeaderWidget greeting', () => {
	it('renders as before without the new keys', () => {
		const wrapper = mountHeader({ title: 'Dashboard', subtitle: 'Welcome' })
		expect(wrapper.find('h2').text()).toBe('Dashboard')
		expect(wrapper.find('[data-testid="cn-header-widget-date"]').exists()).toBe(false)
		expect(wrapper.classes()).not.toContain('cn-header-widget--plain')
		expect(wrapper.element.style.backgroundColor).not.toBe('transparent')
	})

	it.each([
		[0, 'Good morning, Pieter'],
		[11, 'Good morning, Pieter'],
		[12, 'Good afternoon, Pieter'],
		[17, 'Good afternoon, Pieter'],
		[18, 'Good evening, Pieter'],
		[23, 'Good evening, Pieter'],
	])('at %i:15 greets with "%s"', (hour, expected) => {
		expect(mountHeader({ greeting: true }, hour).find('h2').text()).toBe(expected)
	})

	it('uses the whole display name for greeting: "full"', () => {
		expect(mountHeader({ greeting: 'full' }).find('h2').text()).toBe('Good afternoon, Pieter de Vries')
	})

	it('greets without a name when nobody is signed in', () => {
		getCurrentUser.mockReturnValue(null)
		expect(mountHeader({ greeting: true }).find('h2').text()).toBe('Good afternoon')
	})

	it('greets without a name when reading the user throws', () => {
		getCurrentUser.mockImplementation(() => {
			throw new Error('no session')
		})
		expect(mountHeader({ greeting: true }).find('h2').text()).toBe('Good afternoon')
	})

	it('lets the greeting take the place of the title, and keeps the subtitle', () => {
		const wrapper = mountHeader({ greeting: true, title: 'Dashboard', subtitle: 'Your work today' })
		expect(wrapper.findAll('h2')).toHaveLength(1)
		expect(wrapper.find('h2').text()).toBe('Good afternoon, Pieter')
		expect(wrapper.find('.cn-header-widget__subtitle').text()).toBe('Your work today')
	})

	it('writes out the date of today above the heading', () => {
		const wrapper = mountHeader({ greeting: true, showDate: true })
		const date = wrapper.find('[data-testid="cn-header-widget-date"]')
		expect(date.text()).toBe('Monday, 5 October 2026')
		const children = Array.from(wrapper.find('.cn-header-widget__content').element.children)
		expect(children.indexOf(date.element)).toBeLessThan(children.indexOf(wrapper.find('h2').element))
	})

	it('shows the date with a plain title too', () => {
		const wrapper = mountHeader({ title: 'Dashboard', showDate: true })
		expect(wrapper.find('[data-testid="cn-header-widget-date"]').exists()).toBe(true)
		expect(wrapper.find('h2').text()).toBe('Dashboard')
	})

	it('drops the coloured background and aligns to the start when plain', () => {
		const wrapper = mountHeader({ greeting: true, showDate: true, plain: true })
		expect(wrapper.classes()).toContain('cn-header-widget--plain')
		expect(wrapper.element.style.backgroundColor).toBe('transparent')
		expect(wrapper.vm.textColor).toBe('var(--color-main-text)')
		expect(wrapper.vm.textAlign).toBe('left')
		expect(wrapper.vm.dateStyle.color).toBe('var(--color-text-maxcontrast)')
	})

	it('still honours explicit colours and alignment on a plain header', () => {
		const wrapper = mountHeader({ title: 'T', plain: true, backgroundColor: '#ffffff', textAlign: 'center', textColor: '#111111' })
		expect(wrapper.vm.backgroundColor).toBe('#ffffff')
		expect(wrapper.vm.textAlign).toBe('center')
		expect(wrapper.vm.textColor).toBe('#111111')
	})
})

describe('CnHeaderWidgetForm greeting options', () => {
	it('leaves the greeting keys out of the content until they are switched on', () => {
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { value: { title: 'Dashboard' } } })
		wrapper.vm.updateField('title', 'Home')
		const content = wrapper.emitted('update:content')[0][0]
		expect(content).not.toHaveProperty('greeting')
		expect(content).not.toHaveProperty('showDate')
		expect(content).not.toHaveProperty('plain')
	})

	it('writes the keys that are on, and keeps a manifest "full" greeting', () => {
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { editingWidget: { content: { greeting: 'full', showDate: true } } } })
		wrapper.vm.updateField('plain', true)
		const content = wrapper.emitted('update:content')[0][0]
		expect(content.greeting).toBe('full')
		expect(content.showDate).toBe(true)
		expect(content.plain).toBe(true)
	})

	it('does not ask a greeting header for a title', () => {
		const withGreeting = mount(CnHeaderWidgetForm, { propsData: { value: { greeting: true } } })
		expect(withGreeting.vm.validate()).toEqual([])
		const without = mount(CnHeaderWidgetForm, { propsData: { value: {} } })
		expect(without.vm.validate().length).toBeGreaterThan(0)
	})
})

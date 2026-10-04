/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCellRenderer: the built-in `avatar` and `date` cell widgets.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => text,
	getCanonicalLocale: () => 'en-GB',
}))

const { mount } = require('@vue/test-utils')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

const DAY = 86400000
const iso = (offsetDays) => {
	const date = new Date(Date.now() + offsetDays * DAY)
	return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const RULES = [
	{ op: 'lt', value: 0, variant: 'error' },
	{ op: 'lte', value: 5, variant: 'warning' },
]

describe('CnCellRenderer avatar widget', () => {
	it('shows the initials of a free name next to the name', () => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: 'Pieter de Vries', widget: 'avatar' } })
		expect(wrapper.find('.cn-cell-renderer__avatar-initials').text()).toBe('PV')
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('Pieter de Vries')
	})

	it.each([
		['Madonna', 'M'],
		['  anna   maria  jansen ', 'AJ'],
		['Éloïse Ørsted', 'ÉØ'],
	])('makes the initials of "%s" "%s"', (name, initials) => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: name, widget: 'avatar' } })
		expect(wrapper.find('.cn-cell-renderer__avatar-initials').text()).toBe(initials)
	})

	it('hides the picture from assistive technology and leaves the name readable', () => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: 'Pieter de Vries', widget: 'avatar' } })
		expect(wrapper.find('.cn-cell-renderer__avatar-initials').attributes('aria-hidden')).toBe('true')
		expect(wrapper.find('.cn-cell-renderer__avatar-name').attributes('aria-hidden')).toBeUndefined()
	})

	it('shows the Nextcloud avatar when a row field holds the user id', () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: 'Pieter de Vries', widget: 'avatar', widgetProps: { userField: 'handler' }, row: { handler: 'pieter' } },
		})
		expect(wrapper.find('.cn-cell-renderer__avatar-initials').exists()).toBe(false)
		expect(wrapper.find('.cn-cell-renderer__avatar-picture').attributes('aria-hidden')).toBe('true')
		expect(wrapper.vm.avatarUserId).toBe('pieter')
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('Pieter de Vries')
	})

	it('treats the cell value as the user id with user: true, and reads the name from nameField', () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: 'pieter', widget: 'avatar', widgetProps: { user: true, nameField: 'handlerName' }, row: { handlerName: 'Pieter de Vries' } },
		})
		expect(wrapper.vm.avatarUserId).toBe('pieter')
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('Pieter de Vries')
	})

	it('falls back to initials when the user field is empty on this row', () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: 'External Advisor', widget: 'avatar', widgetProps: { userField: 'handler' }, row: { handler: null } },
		})
		expect(wrapper.find('.cn-cell-renderer__avatar-initials').text()).toBe('EA')
	})

	it('honours the size', () => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: 'A B', widget: 'avatar', widgetProps: { size: 32 } } })
		expect(wrapper.find('.cn-cell-renderer__avatar-initials').element.style.width).toBe('32px')
	})

	it('renders a dash for an empty cell', () => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: null, widget: 'avatar' } })
		expect(wrapper.find('.cn-cell-renderer__avatar').exists()).toBe(false)
		expect(wrapper.find('.cn-cell-renderer__dash').exists()).toBe(true)
	})

	it('lets a consumer widget registered under the same id win', () => {
		const Custom = { props: ['value'], template: '<i class="custom-avatar">{{ value }}</i>' }
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: 'Pieter', widget: 'avatar' },
			provide: { cnCellWidgets: { avatar: Custom } },
		})
		expect(wrapper.find('.custom-avatar').exists()).toBe(true)
		expect(wrapper.find('.cn-cell-renderer__avatar').exists()).toBe(false)
	})
})

describe('CnCellRenderer date widget', () => {
	it('renders the date in a time element with a machine-readable value', () => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: '2026-10-05', widget: 'date' } })
		const time = wrapper.find('time')
		expect(time.text()).toBe('5 Oct 2026')
		expect(time.attributes('datetime')).toContain('2026-10-05')
	})

	it('has no variant without rules', () => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: iso(-3), widget: 'date' } })
		expect(wrapper.find('time').classes()).toEqual(['cn-cell-renderer__date'])
	})

	it('marks an overdue date as error', () => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: iso(-3), widget: 'date', widgetProps: { variantWhen: RULES } } })
		expect(wrapper.find('time').classes()).toContain('cn-cell-renderer__date--error')
	})

	it('marks a date within five days as warning', () => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: iso(3), widget: 'date', widgetProps: { variantWhen: RULES } } })
		expect(wrapper.find('time').classes()).toContain('cn-cell-renderer__date--warning')
		expect(wrapper.find('time').classes()).not.toContain('cn-cell-renderer__date--error')
	})

	it('leaves a date further away unmarked', () => {
		const wrapper = mount(CnCellRenderer, { propsData: { value: iso(30), widget: 'date', widgetProps: { variantWhen: RULES } } })
		expect(wrapper.find('time').classes()).toEqual(['cn-cell-renderer__date'])
	})

	it('treats the default variant as no marking', () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: iso(-3), widget: 'date', widgetProps: { variantWhen: [{ op: 'lt', value: 0, variant: 'default' }] } },
		})
		expect(wrapper.find('time').classes()).toEqual(['cn-cell-renderer__date'])
	})

	it('renders a dash for an empty or unreadable value', () => {
		expect(mount(CnCellRenderer, { propsData: { value: null, widget: 'date' } }).find('.cn-cell-renderer__dash').exists()).toBe(true)
		expect(mount(CnCellRenderer, { propsData: { value: 'not a date', widget: 'date' } }).find('time').exists()).toBe(false)
	})
})

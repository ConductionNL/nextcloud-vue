// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { mount } from '@vue/test-utils'
import CnIconPicker from '../../src/components/CnIconPicker/CnIconPicker.vue'
import CnDashboardIcon from '../../src/components/CnIconPicker/CnDashboardIcon.vue'
import CnIcon from '../../src/components/CnIcon/CnIcon.vue'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import {
	getIconComponent,
	isCustomIconUrl,
	DEFAULT_ICON,
	DASHBOARD_ICONS,
} from '../../src/components/CnIconPicker/dashboardIcons.js'

const mocks = { t: (_app, s) => s }

describe('CnIcon dashboard-icon fallback', () => {
	it('resolves a DASHBOARD_ICONS name (what the picker offers) without registering', () => {
		const w = mount(CnIcon, { propsData: { name: 'RocketLaunch' } })
		expect(w.vm.resolvedComponent).toBe(DASHBOARD_ICONS.RocketLaunch)
	})
	it('still falls back to the help icon for a genuinely unknown name', () => {
		const w = mount(CnIcon, { propsData: { name: 'TotallyNotAnIcon' } })
		expect(w.vm.resolvedComponent).toBe(HelpCircleOutline)
	})
})

describe('dashboardIcons helpers', () => {
	it('resolves unknown/empty names to the default icon component', () => {
		expect(getIconComponent('nope')).toBe(DASHBOARD_ICONS[DEFAULT_ICON])
		expect(getIconComponent('')).toBe(DASHBOARD_ICONS[DEFAULT_ICON])
		expect(getIconComponent(null)).toBe(DASHBOARD_ICONS[DEFAULT_ICON])
	})
	it('returns null for URL names (render as img)', () => {
		expect(getIconComponent('/path/x.svg')).toBeNull()
		expect(getIconComponent('http://x/y.png')).toBeNull()
	})
	it('isCustomIconUrl discriminates URLs', () => {
		expect(isCustomIconUrl('/a.svg')).toBe(true)
		expect(isCustomIconUrl('http://a')).toBe(true)
		expect(isCustomIconUrl('Star')).toBe(false)
		expect(isCustomIconUrl('')).toBe(false)
	})
})

describe('CnDashboardIcon', () => {
	it('renders an <img> for URL names', () => {
		const w = mount(CnDashboardIcon, { propsData: { name: '/custom.svg', alt: 'x' } })
		expect(w.find('img').exists()).toBe(true)
		expect(w.find('img').attributes('src')).toBe('/custom.svg')
	})
	it('renders a component for registry names', () => {
		const w = mount(CnDashboardIcon, { propsData: { name: 'Star' } })
		expect(w.find('img').exists()).toBe(false)
	})
})

describe('CnIconPicker', () => {
	it('emits input with the clicked icon registry key', async () => {
		const w = mount(CnIconPicker, { propsData: { value: null }, mocks })
		// Grid of icon tiles — click the one whose aria-label is the registry key.
		const star = w.findAll('.cn-icon-picker__icon').wrappers.find((b) => b.attributes('aria-label') === 'Star')
		await star.trigger('click')
		expect(w.emitted('input')[0]).toEqual(['Star'])
	})

	it('clearable: renders a leading None tile that emits null', async () => {
		const w = mount(CnIconPicker, { propsData: { value: 'Star', clearable: true }, mocks })
		const none = w.find('.cn-icon-picker__none')
		expect(none.exists()).toBe(true)
		await none.trigger('click')
		expect(w.emitted('input')[0]).toEqual([null])
	})

	it('no None tile unless clearable', () => {
		const w = mount(CnIconPicker, { propsData: { value: null }, mocks })
		expect(w.find('.cn-icon-picker__none').exists()).toBe(false)
	})
	it('hides the upload control when no uploadFn is given', () => {
		const w = mount(CnIconPicker, { propsData: { value: null }, mocks })
		expect(w.find('.cn-icon-picker__upload-label').exists()).toBe(false)
	})
	it('shows the upload control when uploadFn is provided', () => {
		const w = mount(CnIconPicker, { propsData: { value: null, uploadFn: async () => ({ url: '/x' }) }, mocks })
		expect(w.find('.cn-icon-picker__upload-label').exists()).toBe(true)
	})
})

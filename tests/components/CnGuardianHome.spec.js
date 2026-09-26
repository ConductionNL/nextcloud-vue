/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnGuardianHome — the guardian/parent portal surface pattern.
 *
 * @spec openspec/changes/guardian-portal-surface-pattern/specs/guardian-portal-surface/spec.md
 */

import { mount } from '@vue/test-utils'
import CnGuardianHome from '../../src/components/CnGuardianHome/CnGuardianHome.vue'

const CHILDREN = [
	{ id: 'child-1', name: 'Amira' },
	{ id: 'child-2', name: 'Bram', avatarUrl: 'https://example.test/bram.png' },
]

const stubs = {
	NcCheckboxRadioSwitch: {
		name: 'NcCheckboxRadioSwitch',
		props: ['modelValue', 'value'],
		template: '<label class="nc-radio-stub" v-bind="$attrs"><input type="radio" :checked="modelValue === value" @change="$emit(\'update:modelValue\', value)" /><slot /></label>',
	},
	NcButton: {
		name: 'NcButton',
		template: '<button class="nc-button-stub" v-bind="$attrs" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
	},
	NcEmptyContent: {
		name: 'NcEmptyContent',
		props: ['name', 'description'],
		template: '<div class="empty"><h2>{{ name }}</h2><p>{{ description }}</p></div>',
	},
	AccountChildOutline: true,
	CalendarRemoveOutline: true,
}

function mountHome(propsData = {}, options = {}) {
	return mount(CnGuardianHome, {
		propsData: { children: CHILDREN, ...propsData },
		stubs,
		...options,
	})
}

describe('CnGuardianHome', () => {
	it('renders the empty state when there are no children', () => {
		const wrapper = mountHome({ children: [] })
		expect(wrapper.findComponent({ name: 'NcEmptyContent' }).exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-guardian-home-switcher"]').exists()).toBe(false)
	})

	it('an "empty" slot override replaces the default empty state', () => {
		const wrapper = mount(CnGuardianHome, {
			propsData: { children: [] },
			stubs,
			scopedSlots: { empty: '<p class="custom-empty">Nothing here</p>' },
		})
		expect(wrapper.find('.custom-empty').exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'NcEmptyContent' }).exists()).toBe(false)
	})

	it('auto-selects the first child when activeChildId is unset', async () => {
		const wrapper = mountHome()
		await wrapper.vm.$nextTick()
		expect(wrapper.emitted('update:activeChildId')).toBeTruthy()
		expect(wrapper.emitted('update:activeChildId')[0]).toEqual(['child-1'])
	})

	it('falls back to the first child when activeChildId names a child no longer present', async () => {
		const wrapper = mountHome({ activeChildId: 'ghost' })
		await wrapper.vm.$nextTick()
		expect(wrapper.emitted('update:activeChildId')[0]).toEqual(['child-1'])
	})

	it('renders one switcher item per child, checking the active one', () => {
		const wrapper = mountHome({ activeChildId: 'child-2' })
		const items = wrapper.findAll('[data-testid^="cn-guardian-home-child-"]')
		expect(items).toHaveLength(2)
		expect(wrapper.find('[data-testid="cn-guardian-home-child-child-2"] input').element.checked).toBe(true)
		expect(wrapper.find('[data-testid="cn-guardian-home-child-child-1"] input').element.checked).toBe(false)
	})

	it('picking a switcher item emits update:activeChildId with that child\'s id', async () => {
		const wrapper = mountHome({ activeChildId: 'child-1' })
		await wrapper.find('[data-testid="cn-guardian-home-child-child-2"] input').trigger('change')
		const emissions = wrapper.emitted('update:activeChildId')
		expect(emissions[emissions.length - 1]).toEqual(['child-2'])
	})

	it('renders an avatar image only for children that have one', () => {
		const wrapper = mountHome()
		const avatars = wrapper.findAll('.cn-guardian-home__avatar')
		expect(avatars).toHaveLength(1)
		expect(avatars.at(0).attributes('src')).toBe('https://example.test/bram.png')
	})

	it('clicking "report absence" emits report-absence with the active child object', async () => {
		const wrapper = mountHome({ activeChildId: 'child-2' })
		await wrapper.find('[data-testid="cn-guardian-home-report-absence"]').trigger('click')
		expect(wrapper.emitted('report-absence')).toBeTruthy()
		expect(wrapper.emitted('report-absence')[0]).toEqual([CHILDREN[1]])
	})

	it('hides the "report absence" button when showAbsenceAction is false', () => {
		const wrapper = mountHome({ showAbsenceAction: false })
		expect(wrapper.find('[data-testid="cn-guardian-home-report-absence"]').exists()).toBe(false)
	})

	it('renders the feed/agenda/consent section titles, default and overridden', async () => {
		// CnTab children register in their own `onMounted`, which pushes onto
		// the parent CnTabs' reactive list and schedules the nav strip's
		// re-render on the microtask queue — a synchronous read finds no nav
		// buttons yet (see CnTabs.spec.js's `mountStrip` for the same trap).
		const defaults = mountHome()
		await defaults.vm.$nextTick()
		expect(defaults.text()).toContain('Feed')
		expect(defaults.text()).toContain('Agenda')
		expect(defaults.text()).toContain('Consent settings')

		const overridden = mountHome({ feedLabel: 'Nieuwsoverzicht', agendaLabel: 'Kalender', consentLabel: 'Toestemmingen' })
		await overridden.vm.$nextTick()
		expect(overridden.text()).toContain('Nieuwsoverzicht')
		expect(overridden.text()).toContain('Kalender')
		expect(overridden.text()).toContain('Toestemmingen')
	})

	it('passes the active child to the feed/agenda/consent scoped slots', () => {
		const wrapper = mount(CnGuardianHome, {
			propsData: { children: CHILDREN, activeChildId: 'child-2' },
			stubs,
			scopedSlots: {
				feed: '<p class="feed-slot">{{ props.child.name }}</p>',
				agenda: '<p class="agenda-slot">{{ props.child.name }}</p>',
				consent: '<p class="consent-slot">{{ props.child.name }}</p>',
			},
		})
		expect(wrapper.find('.feed-slot').text()).toBe('Bram')
		expect(wrapper.find('.agenda-slot').text()).toBe('Bram')
		expect(wrapper.find('.consent-slot').text()).toBe('Bram')
	})

	it('renders a placeholder in a section the host has not configured', () => {
		const wrapper = mountHome()
		expect(wrapper.findAll('.cn-guardian-home__unconfigured').length).toBeGreaterThan(0)
	})
})

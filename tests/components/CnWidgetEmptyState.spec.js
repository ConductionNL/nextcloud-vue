/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnWidgetEmptyState — the designed empty state for a widget.
 *
 * It exists because an empty list widget used to render a CnDataTable with no
 * rows, and a table with no rows still paints its <thead>: a full-width grey
 * strip floating in the middle of an otherwise blank card. That is what the
 * review called "a strange grey bar".
 */

import { mount } from '@vue/test-utils'
import CnWidgetEmptyState from '../../src/components/CnWidgetEmptyState/CnWidgetEmptyState.vue'

const stubs = { TrayRemove: { template: '<span class="tray" />' } }
const mountState = (propsData = {}, opts = {}) => mount(CnWidgetEmptyState, { propsData, stubs, ...opts })

describe('CnWidgetEmptyState', () => {
	it('renders a headline, an icon and no description by default', () => {
		const w = mountState({ name: 'No open cases' })
		expect(w.find('.cn-widget-empty-state__name').text()).toBe('No open cases')
		expect(w.find('.cn-widget-empty-state__icon').exists()).toBe(true)
		expect(w.find('.cn-widget-empty-state__description').exists()).toBe(false)
	})

	it('renders the description when given one', () => {
		const w = mountState({ name: 'No open cases', description: 'Cases assigned to you appear here.' })
		expect(w.find('.cn-widget-empty-state__description').text()).toBe('Cases assigned to you appear here.')
	})

	it('renders an action only when the slot is filled', () => {
		expect(mountState({}).find('.cn-widget-empty-state__action').exists()).toBe(false)
		const w = mountState({}, { slots: { action: '<button class="mine">New</button>' } })
		expect(w.find('.cn-widget-empty-state__action .mine').exists()).toBe(true)
	})

	it('drops to a single row in compact mode', () => {
		const w = mountState({ compact: true })
		expect(w.classes()).toContain('cn-widget-empty-state--compact')
	})

	// Colours come from Nextcloud tokens, never literals — the nldesign app
	// re-themes by overriding those variables, and a hex would opt out of it.
	//
	// Asserted on the computed rather than the rendered `style` attribute:
	// jsdom's CSS parser drops declarations it does not understand, and it
	// understands neither `color-mix()` nor a `var()` it cannot resolve — so
	// the attribute comes back empty and would "pass" the not-a-hex check
	// while proving nothing at all.
	it('colours the icon from a theme token, and tints the circle from the same one', () => {
		const style = mountState({ variant: 'warning' }).vm.iconStyle
		expect(style.color).toBe('var(--color-warning)')
		expect(style.background).toContain('color-mix')
		expect(style.background).toContain('var(--color-warning)')
		expect(JSON.stringify(style)).not.toMatch(/#[0-9a-f]{3,6}/i)
	})

	it('is exposed as a note so assistive tech announces it as content, not decoration', () => {
		expect(mountState({}).attributes('role')).toBe('note')
	})
})

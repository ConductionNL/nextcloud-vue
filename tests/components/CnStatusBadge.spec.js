/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatusBadge's variant resolution. The badge resolves its colour by looking
 * a key up in `colorMap`; that key used to be the label itself, which breaks
 * the moment the label is a translated display string and the map is keyed on
 * the raw value. `colorKey` separates the two — the label is what the user
 * reads, `colorKey` is what the colour is looked up by.
 */

import { mount } from '@vue/test-utils'

import CnStatusBadge from '@/components/CnStatusBadge/CnStatusBadge.vue'

const colorMap = { submitted: 'warning', approved: 'success' }

const variantOf = (wrapper) => ['default', 'primary', 'success', 'warning', 'error', 'info']
	.find((v) => wrapper.find('.cn-status-badge--' + v).exists())

describe('CnStatusBadge — variant resolution', () => {
	it('resolves the variant from the label when no colorKey is given (unchanged)', () => {
		const wrapper = mount(CnStatusBadge, { propsData: { label: 'submitted', colorMap } })

		expect(variantOf(wrapper)).toBe('warning')
		wrapper.unmount()
	})

	it('matches the label case-insensitively (unchanged)', () => {
		const wrapper = mount(CnStatusBadge, { propsData: { label: 'Approved', colorMap } })

		expect(variantOf(wrapper)).toBe('success')
		wrapper.unmount()
	})

	it('resolves from colorKey when the label is a translated string', () => {
		const wrapper = mount(CnStatusBadge, { propsData: { label: 'ingediend', colorKey: 'submitted', colorMap } })

		expect(wrapper.text()).toContain('ingediend')
		expect(variantOf(wrapper)).toBe('warning')
		wrapper.unmount()
	})

	it('MUST-FAIL CONTROL: the same translated label without colorKey falls back to variant', () => {
		// This is the regression `colorKey` exists to prevent — the badge still
		// renders, it just silently loses its colour.
		const wrapper = mount(CnStatusBadge, { propsData: { label: 'ingediend', colorMap } })

		expect(variantOf(wrapper)).toBe('default')
		wrapper.unmount()
	})

	it('falls back to the variant prop when the key is in no map entry', () => {
		const wrapper = mount(CnStatusBadge, { propsData: { label: 'x', colorKey: 'unknown', colorMap, variant: 'info' } })

		expect(variantOf(wrapper)).toBe('info')
		wrapper.unmount()
	})
})

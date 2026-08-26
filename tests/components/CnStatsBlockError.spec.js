/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatsBlock's error state.
 *
 * WHY THIS EXISTS. Eleven tiles across five fleet apps answered a failed fetch
 * with `catch { this.count = 0 }` and rendered a confident zero. Zero is a
 * number a reader believes, so a dashboard with a dead backend looked like a
 * dashboard reporting genuinely empty collections. The tiles had no way to say
 * otherwise: CnStatsBlock could be tinted `error` but had no error STATE, so
 * the colour sat next to a number that was still wrong.
 *
 * The assertions below are about precedence, because that is where this can go
 * quietly wrong: an error branch that loses to a stale `count` re-creates the
 * exact defect it was added to remove.
 */

import { mount } from '@vue/test-utils'

import CnStatsBlock from '../../src/components/CnStatsBlock/CnStatsBlock.vue'

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
}

function mountBlock(propsData) {
	return mount(CnStatsBlock, { propsData, stubs })
}

describe('CnStatsBlock error state', () => {
	it('renders a dash and the error label instead of a count', () => {
		const wrapper = mountBlock({ title: 'Overdue', count: 0, error: true })

		expect(wrapper.find('.cn-stats-block__count--error').exists()).toBe(true)
		expect(wrapper.text()).toContain('Unavailable')
		expect(wrapper.find('.cn-stats-block__count-value').text()).toBe('—')
	})

	it('BEATS a stale count — the whole point of the prop', () => {
		// The failure mode being guarded: a tile that fetched 42 successfully,
		// then failed to refresh, must not keep presenting 42 as current. If
		// this arm ever passes with "42" visible, the error state is decorative.
		const wrapper = mountBlock({ title: 'Leads', count: 42, error: new Error('boom') })

		expect(wrapper.text()).not.toContain('42')
		expect(wrapper.text()).toContain('Unavailable')
	})

	it('beats the loading state', () => {
		const wrapper = mountBlock({ title: 'Leads', count: 0, loading: true, error: true })

		expect(wrapper.find('.cn-stats-block__loading').exists()).toBe(false)
		expect(wrapper.text()).toContain('Unavailable')
	})

	it('beats the empty label, so "no data" never reads as "no items"', () => {
		// These two mean opposite things to a reader and used to look identical.
		const wrapper = mountBlock({ title: 'Leads', count: 0, error: true })

		expect(wrapper.text()).not.toContain('No items found')
		expect(wrapper.text()).toContain('Unavailable')
	})

	it('suppresses the breakdown, which would otherwise describe stale data', () => {
		const wrapper = mountBlock({
			title: 'Leads',
			count: 10,
			breakdown: { open: 4, closed: 6 },
			error: true,
		})

		expect(wrapper.find('.cn-stats-block__breakdown').exists()).toBe(false)
	})

	it('tints itself without the caller also passing variant="error"', () => {
		// Two props for one state means forgetting the second, and forgetting it
		// is invisible: "Unavailable" in the default colour reads as content.
		const wrapper = mountBlock({ title: 'Leads', error: true })

		expect(wrapper.classes()).toContain('cn-stats-block--error')
	})

	it('an error overrides a conflicting variant rather than rendering both', () => {
		const wrapper = mountBlock({ title: 'Leads', variant: 'success', error: true })

		expect(wrapper.classes()).toContain('cn-stats-block--error')
		expect(wrapper.classes()).not.toContain('cn-stats-block--success')
	})

	it('accepts a custom error label', () => {
		const wrapper = mountBlock({ title: 'Leads', error: true, errorLabel: 'Kan niet laden' })

		expect(wrapper.text()).toContain('Kan niet laden')
	})
})

describe('CnStatsBlock without an error (no regression)', () => {
	it('renders the count exactly as before when error is absent', () => {
		const wrapper = mountBlock({ title: 'Leads', count: 42 })

		expect(wrapper.text()).toContain('42')
		expect(wrapper.find('.cn-stats-block__count--error').exists()).toBe(false)
		expect(wrapper.classes()).not.toContain('cn-stats-block--error')
	})

	it('keeps an explicit variant when there is no error', () => {
		const wrapper = mountBlock({ title: 'Leads', count: 42, variant: 'success' })

		expect(wrapper.classes()).toContain('cn-stats-block--success')
	})

	it('a null error is not an error', () => {
		const wrapper = mountBlock({ title: 'Leads', count: 7, error: null })

		expect(wrapper.text()).toContain('7')
	})

	it('an EMPTY STRING is not an error', () => {
		// A caller that clears its message back to '' is reporting recovery,
		// not failure. Treating falsy-but-present as an error would pin the
		// tile in its error state after the fetch succeeded again.
		const wrapper = mountBlock({ title: 'Leads', count: 7, error: '' })

		expect(wrapper.text()).toContain('7')
		expect(wrapper.classes()).not.toContain('cn-stats-block--error')
	})

	it('still shows the empty label at count 0 with no error', () => {
		const wrapper = mountBlock({ title: 'Leads', count: 0 })

		expect(wrapper.text()).toContain('No items found')
	})
})

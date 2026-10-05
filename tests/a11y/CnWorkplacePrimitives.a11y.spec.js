/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for the workplace dashboard primitives: the week
 * strip, the stacked bar, the attention card, the segmented control, the
 * brand stripe, counts on filter chips, and the avatar and date cells.
 *
 * This lane renders the REAL `@nextcloud/vue` components (the unit lane stubs
 * them), so the axe scans here inspect the markup a user gets.
 *
 * Each scan is paired with a structural assertion. axe in jsdom computes no
 * layout and loads no stylesheet, so it cannot see a colour-only signal or a
 * scroll area nobody can focus. Those are asserted by hand, and each of them
 * was checked to fail when the attribute it names is removed.
 *
 * @spec openspec/specs/wcag-a11y-anchor/spec.md
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md
 */

const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')
const CnBannerWidget = require('../../src/components/CnBannerWidget/CnBannerWidget.vue').default
const CnBrandStripe = require('../../src/components/CnBrandStripe/CnBrandStripe.vue').default
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default
const CnQuickFilterBar = require('../../src/components/CnQuickFilterBar/CnQuickFilterBar.vue').default
const CnSegmentedControl = require('../../src/components/CnSegmentedControl/CnSegmentedControl.vue').default
const CnStackedBarWidget = require('../../src/components/CnStackedBarWidget/CnStackedBarWidget.vue').default
const CnWeekStripWidget = require('../../src/components/CnWeekStripWidget/CnWeekStripWidget.vue').default

const NOW = new Date(2026, 9, 7, 10, 0) // Wednesday 7 October 2026

describe('workplace dashboard primitives: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	describe('CnWeekStripWidget', () => {
		const content = {
			emptyText: 'No deadlines',
			items: [
				{ title: 'Parking permits', meta: '2026-0061 · Woo', date: '2026-10-05', href: 'https://example.org/a' },
				{ title: 'Objection', meta: '2026-0074', date: '2026-10-07', href: 'https://example.org/b' },
				{ title: 'Tender', date: '2026-10-09' },
			],
		}

		it('has no WCAG 2.1 AA violations', async () => {
			wrapper = mountAttached(CnWeekStripWidget, { propsData: { content, now: NOW } })
			await expectAccessible(wrapper)
		})

		it('has no WCAG 2.1 AA violations with seven empty days', async () => {
			wrapper = mountAttached(CnWeekStripWidget, { propsData: { content: { days: 7 }, now: NOW } })
			await expectAccessible(wrapper)
		})

		it('lets a keyboard user reach the scroll area and every linked item', () => {
			wrapper = mountAttached(CnWeekStripWidget, { propsData: { content, now: NOW } })
			const region = wrapper.element.querySelector('[role="region"]')
			expect(region.getAttribute('tabindex')).toBe('0')
			expect(region.getAttribute('aria-label')).toBeTruthy()
			const links = wrapper.element.querySelectorAll('a[href]')
			expect(links).toHaveLength(2)
			links.forEach((link) => expect(link.getAttribute('tabindex')).toBeNull())
		})

		it('says "late" in words and marks today for assistive technology', () => {
			wrapper = mountAttached(CnWeekStripWidget, { propsData: { content, now: NOW } })
			const late = wrapper.element.querySelector('.cn-week-strip__item--late')
			expect(late.textContent).toContain('Late')
			expect(wrapper.element.querySelectorAll('[aria-current="date"]')).toHaveLength(1)
		})
	})

	describe('CnStackedBarWidget', () => {
		const content = {
			segments: [
				{ label: 'Received', value: 3 },
				{ label: 'In progress', value: 6 },
				{ label: 'Decision', value: 0 },
			],
		}

		it('has no WCAG 2.1 AA violations', async () => {
			wrapper = mountAttached(CnStackedBarWidget, { propsData: { content } })
			await expectAccessible(wrapper)
		})

		it('has no WCAG 2.1 AA violations when empty', async () => {
			wrapper = mountAttached(CnStackedBarWidget, { propsData: { content: {} } })
			await expectAccessible(wrapper)
		})

		it('carries every number in the legend, outside the hidden bar', () => {
			wrapper = mountAttached(CnStackedBarWidget, { propsData: { content } })
			const bar = wrapper.element.querySelector('.cn-stacked-bar__bar')
			expect(bar.getAttribute('aria-hidden')).toBe('true')
			expect(bar.textContent.trim()).toBe('')
			const legend = wrapper.element.querySelector('.cn-stacked-bar__legend')
			expect(legend.closest('[aria-hidden="true"]')).toBeNull()
			const text = legend.textContent.replace(/\s+/g, ' ')
			for (const expected of ['Received 3', 'In progress 6', 'Decision 0']) {
				expect(text).toContain(expected)
			}
		})
	})

	describe('CnBannerWidget attention card', () => {
		const card = {
			layout: 'attention',
			variant: 'error',
			kicker: 'First today',
			title: 'Parking permits city centre',
			reason: 'The deadline ends today.',
			actions: [{ label: 'Open case', href: 'https://example.org/case' }, { label: 'Suspend deadline', id: 'suspend' }],
		}

		it.each(['info', 'warning', 'error', 'success'])('has no WCAG 2.1 AA violations as %s', async (variant) => {
			wrapper = mountAttached(CnBannerWidget, { propsData: { ...card, variant } })
			await expectAccessible(wrapper)
		})

		it('still has no violations as the plain banner', async () => {
			wrapper = mountAttached(CnBannerWidget, { propsData: { text: 'Heads up', variant: 'warning' } })
			await expectAccessible(wrapper)
		})

		it('names its region by the title and offers native, focusable actions', () => {
			wrapper = mountAttached(CnBannerWidget, { propsData: card })
			const section = wrapper.element
			const heading = section.querySelector(`#${section.getAttribute('aria-labelledby')}`)
			expect(heading.textContent.trim()).toBe('Parking permits city centre')
			const actions = section.querySelectorAll('.cn-banner-widget__action')
			expect(Array.from(actions).map((action) => action.tagName)).toEqual(['A', 'BUTTON'])
		})
	})

	describe('CnSegmentedControl', () => {
		const options = [
			{ value: 'mine', label: 'My work' },
			{ value: 'team', label: 'My team', count: 12 },
			{ value: 'all', label: 'Everyone', disabled: true },
		]

		it('has no WCAG 2.1 AA violations', async () => {
			wrapper = mountAttached(CnSegmentedControl, { propsData: { options, modelValue: 'mine', ariaLabel: 'View' } })
			await expectAccessible(wrapper)
		})

		it('has no WCAG 2.1 AA violations with nothing chosen', async () => {
			wrapper = mountAttached(CnSegmentedControl, { propsData: { options, ariaLabel: 'View' } })
			await expectAccessible(wrapper)
		})

		it('is one tab stop, on the checked radio', () => {
			wrapper = mountAttached(CnSegmentedControl, { propsData: { options, modelValue: 'team', ariaLabel: 'View' } })
			const stops = wrapper.element.querySelectorAll('[role="radio"][tabindex="0"]')
			expect(stops).toHaveLength(1)
			expect(stops[0].getAttribute('aria-checked')).toBe('true')
		})
	})

	describe('CnBrandStripe', () => {
		it('has no WCAG 2.1 AA violations and stays out of the accessibility tree', async () => {
			wrapper = mountAttached(CnBrandStripe)
			await expectAccessible(wrapper)
			expect(wrapper.element.getAttribute('aria-hidden')).toBe('true')
		})
	})

	describe('CnQuickFilterBar with counts', () => {
		const tabs = [
			{ label: 'Open', filter: { status: 'open' } },
			{ label: 'Closed', filter: { status: 'closed' } },
		]

		it('has no WCAG 2.1 AA violations', async () => {
			wrapper = mountAttached(CnQuickFilterBar, { propsData: { tabs, activeIndex: 0, counts: { 0: 12, 1: 0 } } })
			await expectAccessible(wrapper)
		})

		it('reads label and count as two words', () => {
			wrapper = mountAttached(CnQuickFilterBar, { propsData: { tabs, activeIndex: 0, counts: { 0: 12 } } })
			const tab = wrapper.element.querySelector('[role="tab"]')
			expect(tab.textContent.replace(/\s+/g, ' ').trim()).toBe('Open 12')
		})
	})

	describe('CnCellRenderer avatar and date cells', () => {
		it('has no WCAG 2.1 AA violations for a free name', async () => {
			wrapper = mountAttached(CnCellRenderer, { propsData: { value: 'Pieter de Vries', widget: 'avatar' } })
			await expectAccessible(wrapper)
		})

		it('has no WCAG 2.1 AA violations for a Nextcloud user', async () => {
			wrapper = mountAttached(CnCellRenderer, {
				propsData: { value: 'Pieter de Vries', widget: 'avatar', widgetProps: { userField: 'handler' }, row: { handler: 'pieter' } },
			})
			await expectAccessible(wrapper)
			expect(wrapper.element.querySelector('.cn-cell-renderer__avatar-picture').getAttribute('aria-hidden')).toBe('true')
			expect(wrapper.element.querySelector('.cn-cell-renderer__avatar-name').textContent).toBe('Pieter de Vries')
		})

		it('has no WCAG 2.1 AA violations for an overdue date', async () => {
			wrapper = mountAttached(CnCellRenderer, {
				propsData: { value: '2020-01-01', widget: 'date', widgetProps: { variantWhen: [{ op: 'lt', value: 0, variant: 'error' }] } },
			})
			await expectAccessible(wrapper)
			expect(wrapper.element.querySelector('time').classList.contains('cn-cell-renderer__date--error')).toBe(true)
		})
	})
})

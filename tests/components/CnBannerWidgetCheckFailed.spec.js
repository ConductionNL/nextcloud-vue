/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An attention card whose `visibleWhen` request FAILS says so, in one quiet
 * line. Before this it stayed hidden, and on a dashboard its cell collapsed,
 * which reads as "nothing needs attention". A failed count does not know that.
 *
 * What must NOT change is pinned here too: a count that was read and does not
 * meet the condition renders nothing, and a plain banner stays hidden when
 * its request fails.
 *
 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-an-attention-card-says-when-it-could-not-check
 */

// Apexcharts is stubbed globally via jest.config.js moduleNameMapper.

import { flushPromises, mount } from '@vue/test-utils'
import CnBannerWidget from '@/components/CnBannerWidget/CnBannerWidget.vue'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { registerDashboardWidget } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { readVisibleWhenValue } from '@/utils/visibleWhen.js'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@/utils/visibleWhen.js', () => ({
	...jest.requireActual('@/utils/visibleWhen.js'),
	readVisibleWhenValue: jest.fn(),
}))

const CONDITION = { endpoint: '/apps/x/api/status', field: 'late', op: 'gt', value: 0 }
const CARD = { layout: 'attention', variant: 'error', kicker: 'First today', title: 'Parking permits city centre', reason: 'The deadline ends today.' }

const unchecked = (wrapper) => wrapper.find('[data-testid="cn-banner-widget-unchecked"]')
const card = (wrapper) => wrapper.find('[data-testid="cn-banner-widget-attention"]')

let warn

beforeEach(() => {
	readVisibleWhenValue.mockReset()
	warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	warn.mockRestore()
})

describe('CnBannerWidget: an attention card whose check failed', () => {
	it('shows one line with the reason as a tooltip, and not the card', async () => {
		readVisibleWhenValue.mockRejectedValue(new Error('endpoint returned 500'))
		const wrapper = mount(CnBannerWidget, { propsData: { ...CARD, visibleWhen: CONDITION } })
		await flushPromises()

		expect(card(wrapper).exists()).toBe(false)
		const line = unchecked(wrapper)
		expect(line.exists()).toBe(true)
		expect(line.find('.cn-banner-widget__unchecked-text').text()).toBe('Could not check: Parking permits city centre')
		expect(line.attributes('title')).toBe('The check failed: endpoint returned 500')
		// The reason is in the DOM too, for a reader who gets no tooltip.
		expect(line.find('.cn-banner-widget__unchecked-reason').text()).toBe('The check failed: endpoint returned 500')
	})

	it('is not an alarm: no alert role, no severity class, no action', async () => {
		readVisibleWhenValue.mockRejectedValue(new Error('endpoint returned 500'))
		const wrapper = mount(CnBannerWidget, {
			propsData: { ...CARD, actions: [{ label: 'Open case', id: 'open' }], visibleWhen: CONDITION },
		})
		await flushPromises()

		const line = unchecked(wrapper)
		expect(line.attributes('role')).toBeUndefined()
		expect(line.classes()).not.toContain('cn-banner-widget--error')
		expect(wrapper.find('[data-testid="cn-banner-widget-action"]').exists()).toBe(false)
	})

	it('does not name a title that needs the value it could not read', async () => {
		readVisibleWhenValue.mockRejectedValue(new Error('source returned 403'))
		const wrapper = mount(CnBannerWidget, {
			propsData: { layout: 'attention', title: '{value} cases are late', visibleWhen: CONDITION },
		})
		await flushPromises()

		expect(unchecked(wrapper).find('.cn-banner-widget__unchecked-text').text()).toBe('Could not check')
	})

	it('says "The check failed." when the failure carries no reason', async () => {
		readVisibleWhenValue.mockRejectedValue(new Error(''))
		const wrapper = mount(CnBannerWidget, { propsData: { ...CARD, visibleWhen: CONDITION } })
		await flushPromises()

		expect(unchecked(wrapper).attributes('title')).toBe('The check failed.')
	})

	it('renders nothing when the request succeeds and the count does not meet the condition', async () => {
		readVisibleWhenValue.mockResolvedValue(0)
		const wrapper = mount(CnBannerWidget, { propsData: { ...CARD, visibleWhen: CONDITION } })
		await flushPromises()

		expect(card(wrapper).exists()).toBe(false)
		expect(unchecked(wrapper).exists()).toBe(false)
		expect(wrapper.text()).toBe('')
	})

	it('renders the card, and no failure line, when the condition is met', async () => {
		readVisibleWhenValue.mockResolvedValue(3)
		const wrapper = mount(CnBannerWidget, { propsData: { ...CARD, visibleWhen: CONDITION } })
		await flushPromises()

		expect(card(wrapper).exists()).toBe(true)
		expect(unchecked(wrapper).exists()).toBe(false)
	})

	it('a plain banner stays hidden when its request fails, as before', async () => {
		readVisibleWhenValue.mockRejectedValue(new Error('endpoint returned 500'))
		const wrapper = mount(CnBannerWidget, { propsData: { text: 'Migrations pending', variant: 'warning', visibleWhen: CONDITION } })
		await flushPromises()

		expect(unchecked(wrapper).exists()).toBe(false)
		expect(wrapper.text()).toBe('')
	})

	it('takes a failure the host already found, without a request of its own', async () => {
		const wrapper = mount(CnBannerWidget, {
			propsData: { ...CARD, visibleWhen: CONDITION, conditionOutcome: { met: false, value: null, failed: true, reason: 'source returned 502' } },
		})
		await flushPromises()

		expect(readVisibleWhenValue).not.toHaveBeenCalled()
		expect(unchecked(wrapper).attributes('title')).toBe('The check failed: source returned 502')
	})

	it('a host outcome that is simply unmet renders nothing', async () => {
		const wrapper = mount(CnBannerWidget, {
			propsData: { ...CARD, visibleWhen: CONDITION, conditionOutcome: { met: false, value: 0 } },
		})
		await flushPromises()

		expect(unchecked(wrapper).exists()).toBe(false)
		expect(card(wrapper).exists()).toBe(false)
	})
})

describe('the failure line is translated', () => {
	const KEYS = ['Could not check', 'Could not check: {subject}', 'The check failed.', 'The check failed: {reason}']

	it.each(KEYS)('%s is in the English and the Dutch catalog', (key) => {
		const en = require('../../l10n/en.json').translations
		const nl = require('../../l10n/nl.json').translations
		expect(en[key]).toBe(key)
		expect(typeof nl[key]).toBe('string')
		expect(nl[key]).not.toBe(key)
		// A placeholder the source has must survive translation.
		for (const placeholder of key.match(/\{\w+\}/g) ?? []) {
			expect(nl[key]).toContain(placeholder)
		}
	})
})

describe('CnDashboardPage: the cell of an attention card whose check failed', () => {
	const renderer = { template: '<div class="rend" />' }
	registerDashboardWidget('test-check-failed-neighbour', { renderer, form: {}, defaultContent: {}, displayName: 'N', icon: 'X' })

	const stubs = {
		CnDashboardGrid: {
			template: '<div><div v-for="it in layout" :key="it.id" class="cell" :data-wid="it.widgetId" :data-y="it.gridY"><slot name="widget" :item="it" /></div></div>',
			props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
		},
		CnWidgetWrapper: { props: ['flush', 'showTitle', 'title'], template: '<div class="ww"><slot /></div>' },
		NcButton: { template: '<button><slot /></button>' },
		NcEmptyContent: { template: '<div />' },
		NcLoadingIcon: { template: '<div class="loading" />' },
	}

	/**
	 * @param {object} content The banner's stored content.
	 * @return {object} The mounted dashboard.
	 */
	function mountDashboard(content) {
		return mount(CnDashboardPage, {
			propsData: {
				widgets: [{ id: 'b', type: 'banner', content }, { id: 'w', type: 'test-check-failed-neighbour' }],
				layout: [
					{ id: '1', widgetId: 'b', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 1 },
					{ id: '2', widgetId: 'w', gridX: 0, gridY: 1, gridWidth: 6, gridHeight: 4 },
				],
			},
			stubs,
		})
	}

	const cells = (wrapper) => wrapper.findAll('.cell').map((c) => ({ wid: c.attributes('data-wid'), y: c.attributes('data-y') }))

	it('keeps the cell and shows the failure line when the count request fails', async () => {
		readVisibleWhenValue.mockRejectedValue(new Error('source returned 500'))
		const wrapper = mountDashboard({ ...CARD, visibleWhen: CONDITION })
		await flushPromises()

		expect(cells(wrapper)).toEqual([{ wid: 'b', y: '0' }, { wid: 'w', y: '1' }])
		expect(card(wrapper).exists()).toBe(false)
		expect(unchecked(wrapper).attributes('title')).toBe('The check failed: source returned 500')
		// One request: the banner renders from the page's outcome.
		expect(readVisibleWhenValue).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('widget "b"'), 'source returned 500')
	})

	it('gives the cell up when the count was read and does not meet the condition', async () => {
		readVisibleWhenValue.mockResolvedValue(0)
		const wrapper = mountDashboard({ ...CARD, visibleWhen: CONDITION })
		await flushPromises()

		expect(cells(wrapper)).toEqual([{ wid: 'w', y: '0' }])
		expect(unchecked(wrapper).exists()).toBe(false)
		expect(warn).not.toHaveBeenCalled()
	})

	it('a plain banner whose request fails still gives its cell up', async () => {
		readVisibleWhenValue.mockRejectedValue(new Error('endpoint returned 500'))
		const wrapper = mountDashboard({ text: 'Migrations pending', visibleWhen: CONDITION })
		await flushPromises()

		expect(cells(wrapper)).toEqual([{ wid: 'w', y: '0' }])
		expect(unchecked(wrapper).exists()).toBe(false)
	})
})

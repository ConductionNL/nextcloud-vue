/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnWeekStripWidget: day columns, today, late items, empty days, links, and
 * the single request an OpenRegister source costs.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
 */

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnWeekStripWidget from '../../src/components/CnWeekStripWidget/CnWeekStripWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

jest.mock('@nextcloud/router', () => ({
	generateUrl: (path, params = {}) => Object.entries(params).reduce((url, [key, value]) => url.replace(`{${key}}`, value), path),
}))

// Wednesday 7 October 2026. The week runs Monday 5 to Sunday 11.
const NOW = new Date(2026, 9, 7, 10, 0)

const flush = () => new Promise((resolve) => setTimeout(resolve))

const STATIC = {
	emptyText: 'No deadlines',
	items: [
		{ title: 'Parking permits', meta: '2026-0061 · Woo', date: '2026-10-05', route: 'CaseDetail' },
		{ title: 'Objection', meta: '2026-0074', date: '2026-10-07', href: 'https://example.org/case' },
		{ title: 'Tender', date: '2026-10-09' },
		{ title: 'Saturday item', date: '2026-10-10' },
		{ title: 'Next week', date: '2026-10-13' },
	],
}

/**
 * Mount the widget on the fixed reference day.
 *
 * @param {object} content The content blob.
 * @param {object} [options] Extra mount options.
 * @return {object} The wrapper.
 */
function mountStrip(content, options = {}) {
	return mount(CnWeekStripWidget, { propsData: { content, now: NOW }, ...options })
}

describe('CnWeekStripWidget', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('is registered as the week-strip widget with a form', () => {
		const entry = getWidgetTypeEntry('week-strip')
		expect(entry.renderer).toBe(CnWeekStripWidget)
		expect(entry.form.name).toBe('CnWeekStripWidgetForm')
	})

	it('renders the five working days of the current week by default', () => {
		const wrapper = mountStrip(STATIC)
		const days = wrapper.findAll('.cn-week-strip__day')
		expect(days.map((day) => day.attributes('data-day'))).toEqual([
			'2026-10-05',
			'2026-10-06',
			'2026-10-07',
			'2026-10-08',
			'2026-10-09',
		])
		expect(wrapper.text()).not.toContain('Saturday item')
	})

	it('renders seven days when configured', () => {
		const wrapper = mountStrip({ ...STATIC, days: 7 })
		expect(wrapper.findAll('.cn-week-strip__day')).toHaveLength(7)
		expect(wrapper.text()).toContain('Saturday item')
	})

	it('moves whole weeks with weekOffset', () => {
		const wrapper = mountStrip({ ...STATIC, weekOffset: 1 })
		expect(wrapper.find('.cn-week-strip__day').attributes('data-day')).toBe('2026-10-12')
		expect(wrapper.text()).toContain('Next week')
		expect(wrapper.find('[aria-current]').exists()).toBe(false)
	})

	it('highlights today and nothing else', () => {
		const wrapper = mountStrip(STATIC)
		const current = wrapper.findAll('[aria-current="date"]')
		expect(current).toHaveLength(1)
		expect(current[0].attributes('data-day')).toBe('2026-10-07')
		expect(current[0].classes()).toContain('cn-week-strip__day--today')
		expect(current[0].find('.cn-week-strip__today').text()).toBe('today')
		expect(wrapper.findAll('.cn-week-strip__today')).toHaveLength(1)
	})

	it('buckets each item under its own day', () => {
		const wrapper = mountStrip(STATIC)
		const day = (key) => wrapper.find(`[data-day="${key}"]`)
		expect(day('2026-10-05').text()).toContain('Parking permits')
		expect(day('2026-10-05').text()).toContain('2026-0061 · Woo')
		expect(day('2026-10-07').text()).toContain('Objection')
		expect(day('2026-10-09').text()).toContain('Tender')
	})

	it('marks an item before today late, in text, and leaves the others alone', () => {
		const wrapper = mountStrip(STATIC)
		const late = wrapper.findAll('.cn-week-strip__item--late')
		expect(late).toHaveLength(1)
		expect(late[0].text()).toContain('Parking permits')
		expect(late[0].find('.cn-week-strip__late').text()).toBe('Late')
		expect(wrapper.find('[data-day="2026-10-07"] .cn-week-strip__late').exists()).toBe(false)
	})

	it('honours lateWhen, so today can count as late too', () => {
		const wrapper = mountStrip({ ...STATIC, lateWhen: { op: 'lte', value: 0 } })
		expect(wrapper.findAll('.cn-week-strip__item--late')).toHaveLength(2)
	})

	it('honours an explicit late flag in both directions', () => {
		const wrapper = mountStrip({
			items: [
				{ title: 'Forced late', date: '2026-10-09', late: true },
				{ title: 'Forced on time', date: '2026-10-05', late: false },
			],
		})
		const late = wrapper.findAll('.cn-week-strip__item--late')
		expect(late).toHaveLength(1)
		expect(late[0].text()).toContain('Forced late')
	})

	it('says so when a day has nothing', () => {
		const wrapper = mountStrip(STATIC)
		const empty = wrapper.findAll('.cn-week-strip__empty')
		// Tuesday and Thursday.
		expect(empty).toHaveLength(2)
		expect(empty[0].text()).toBe('No deadlines')
	})

	it('falls back to a default empty text', () => {
		const wrapper = mountStrip({})
		expect(wrapper.findAll('.cn-week-strip__empty')).toHaveLength(5)
		expect(wrapper.find('.cn-week-strip__empty').text()).toBe('Nothing planned')
	})

	it('runs the manifest texts through the translate function', () => {
		const wrapper = mountStrip(STATIC, { propsData: { content: STATIC, now: NOW, translate: (key) => `t(${key})` } })
		expect(wrapper.find('.cn-week-strip__empty').text()).toBe('t(No deadlines)')
		expect(wrapper.text()).toContain('t(Tender)')
	})

	it('renders a routed item as a link and routes a plain click', async () => {
		const push = jest.fn().mockResolvedValue()
		const $router = { push, resolve: (location) => ({ href: `/app/${location.name}` }) }
		const wrapper = mountStrip(STATIC, { global: { mocks: { $router } } })
		const link = wrapper.find('[data-day="2026-10-05"] a')
		expect(link.attributes('href')).toBe('/app/CaseDetail')
		await link.trigger('click')
		expect(push).toHaveBeenCalledWith({ name: 'CaseDetail' })
	})

	it('renders an external href as a plain link and an item without target as text', () => {
		const wrapper = mountStrip(STATIC)
		expect(wrapper.find('[data-day="2026-10-07"] a').attributes('href')).toBe('https://example.org/case')
		expect(wrapper.find('[data-day="2026-10-09"] a').exists()).toBe(false)
		expect(wrapper.find('[data-day="2026-10-09"] .cn-week-strip__item').element.tagName).toBe('DIV')
	})

	it('drops an unsafe href', () => {
		const wrapper = mountStrip({ items: [{ title: 'Bad', date: '2026-10-07', href: 'javascript:alert(1)' }] })
		expect(wrapper.find('a').exists()).toBe(false)
	})

	it('scrolls inside a focusable, named region', () => {
		const wrapper = mountStrip(STATIC)
		const region = wrapper.find('.cn-week-strip__scroll')
		expect(region.attributes('role')).toBe('region')
		expect(region.attributes('tabindex')).toBe('0')
		expect(region.attributes('aria-label')).toBeTruthy()
		expect(region.find('ol').exists()).toBe(true)
	})

	describe('with an OpenRegister source', () => {
		const SOURCE = {
			source: { register: 'dossiq', schema: 'case', filter: { status: 'open', priority: { gte: 2 } } },
			dateField: 'deadline',
			titleField: 'title',
			metaFields: ['identifier', 'caseType', 'missing'],
			itemRoute: 'CaseDetail',
		}

		it('makes ONE request, windowed to the days it shows', async () => {
			const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: { results: [] } })
			mountStrip(SOURCE)
			await flush()
			expect(get).toHaveBeenCalledTimes(1)
			const [url, config] = get.mock.calls[0]
			expect(url).toBe('/apps/openregister/api/objects/dossiq/case')
			expect(config.params).toEqual({
				_limit: 100,
				'_order[deadline]': 'asc',
				status: 'open',
				'priority[gte]': 2,
				'deadline[gte]': '2026-10-05',
				'deadline[lt]': '2026-10-10',
			})
		})

		it('renders the records, with the title, the meta fields and a link', async () => {
			jest.spyOn(axios, 'get').mockResolvedValue({
				data: {
					results: [
						{ id: 'a1', title: 'Parking permits', identifier: '2026-0061', caseType: 'Woo', deadline: '2026-10-06T12:00:00+02:00' },
						{ '@self': { id: 'b2', name: 'Named by the envelope' }, deadline: '2026-10-08' },
					],
				},
			})
			const $router = { push: jest.fn(), resolve: (location) => ({ href: `/app/${location.name}/${location.params.id}` }) }
			const wrapper = mountStrip(SOURCE, { global: { mocks: { $router } } })
			await flush()
			const tuesday = wrapper.find('[data-day="2026-10-06"]')
			expect(tuesday.find('.cn-week-strip__title').text()).toBe('Parking permits')
			expect(tuesday.find('.cn-week-strip__meta').text()).toBe('2026-0061 · Woo')
			expect(tuesday.find('a').attributes('href')).toBe('/app/CaseDetail/a1')
			expect(tuesday.find('.cn-week-strip__item--late').exists()).toBe(true)
			const thursday = wrapper.find('[data-day="2026-10-08"]')
			expect(thursday.find('.cn-week-strip__title').text()).toBe('Named by the envelope')
			expect(thursday.find('a').attributes('href')).toBe('/app/CaseDetail/b2')
		})

		it('marks a record late through lateField', async () => {
			jest.spyOn(axios, 'get').mockResolvedValue({
				data: { results: [{ id: 'c3', title: 'Flagged', deadline: '2026-10-09', overdue: true }] },
			})
			const wrapper = mountStrip({ ...SOURCE, lateField: 'overdue' })
			await flush()
			expect(wrapper.find('[data-day="2026-10-09"] .cn-week-strip__item--late').exists()).toBe(true)
		})

		it('shows a loading state while the request is out', async () => {
			let resolve
			jest.spyOn(axios, 'get').mockReturnValue(new Promise((r) => {
				resolve = r
			}))
			const wrapper = mountStrip(SOURCE)
			await flush()
			expect(wrapper.find('[role="status"]').exists()).toBe(true)
			expect(wrapper.find('.cn-week-strip__days').exists()).toBe(false)
			resolve({ data: { results: [] } })
			await flush()
			expect(wrapper.find('.cn-week-strip__days').exists()).toBe(true)
		})

		it('says the items could not be loaded when the request fails', async () => {
			jest.spyOn(console, 'warn').mockImplementation(() => {})
			jest.spyOn(axios, 'get').mockRejectedValue(new Error('500'))
			const wrapper = mountStrip(SOURCE)
			await flush()
			expect(wrapper.find('[role="status"]').text()).toContain('could not be loaded')
			expect(wrapper.find('.cn-week-strip__days').exists()).toBe(false)
		})

		it('makes no request without a date field', async () => {
			const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: { results: [] } })
			mountStrip({ source: { register: 'dossiq', schema: 'case' } })
			await flush()
			expect(get).not.toHaveBeenCalled()
		})
	})
})

/**
 * Tests for CnDashboardPage's date-range header.
 *
 * Covers:
 *   - prop omitted → no header rendered (backwards compat)
 *   - enabled → picker rendered + initial last-7 fallback
 *   - persistKey rehydration on mount
 *   - change handling: emits event + persists + updates provide
 *   - localStorage failure is non-fatal
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('vue-apexcharts', () => ({ name: 'vue-apexcharts-stub' }), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: {
		template: '<div class="cn-dashboard-grid-stub"></div>',
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
	},
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	CnWidgetRenderer: { template: '<div />' },
	CnTileWidget: { template: '<div />' },
	CnChartWidget: { template: '<div class="cn-chart-widget-stub" />' },
	CnStatsBlockWidget: { template: '<div />' },
	CnWidgetRefItem: { template: '<div />' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
	// Stub the picker so we can drive events without booting NcDateTimePicker.
	CnDateRangePicker: {
		name: 'CnDateRangePicker',
		template: '<div class="cn-date-range-picker-stub" :data-from="value && value.from" :data-to="value && value.to" :data-preset="value && value.preset" />',
		props: ['value', 'presets', 'disabled'],
	},
}

describe('CnDashboardPage — dateRange prop', () => {
	beforeEach(() => {
		// jest-jsdom provides localStorage; reset between tests.
		try { localStorage.clear() } catch (_e) { /* ignore */ }
	})

	it('omitted prop → no header rendered (backwards compat)', () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { layout: [], widgets: [] },
			stubs,
		})
		expect(wrapper.find('[data-testid="cn-dashboard-page-date-range"]').exists()).toBe(false)
		expect(wrapper.find('.cn-date-range-picker-stub').exists()).toBe(false)
	})

	it('enabled false → no header', () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { dateRange: { enabled: false }, layout: [], widgets: [] },
			stubs,
		})
		expect(wrapper.find('[data-testid="cn-dashboard-page-date-range"]').exists()).toBe(false)
	})

	it('enabled true → picker rendered with last-7 fallback', () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { dateRange: { enabled: true }, layout: [], widgets: [] },
			stubs,
		})
		const picker = wrapper.find('.cn-date-range-picker-stub')
		expect(picker.exists()).toBe(true)
		expect(picker.attributes('data-preset')).toBe('last-7')
		// last-7 from/to should be non-empty ISO strings
		expect(picker.attributes('data-from')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
		expect(picker.attributes('data-to')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
	})

	it('explicit default takes priority over last-7 fallback', () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: {
				dateRange: {
					enabled: true,
					default: {
						from: '2026-01-01T00:00:00.000Z',
						to: '2026-01-31T23:59:59.999Z',
						preset: 'custom',
					},
				},
				layout: [], widgets: [],
			},
			stubs,
		})
		const picker = wrapper.find('.cn-date-range-picker-stub')
		expect(picker.attributes('data-from')).toBe('2026-01-01T00:00:00.000Z')
		expect(picker.attributes('data-to')).toBe('2026-01-31T23:59:59.999Z')
		expect(picker.attributes('data-preset')).toBe('custom')
	})

	it('rehydrates from localStorage when persistKey is set', () => {
		localStorage.setItem('test.key', JSON.stringify({
			from: '2026-04-01T00:00:00.000Z',
			to: '2026-04-30T23:59:59.999Z',
			preset: 'custom',
		}))
		const wrapper = mount(CnDashboardPage, {
			propsData: {
				dateRange: { enabled: true, persistKey: 'test.key' },
				layout: [], widgets: [],
			},
			stubs,
		})
		const picker = wrapper.find('.cn-date-range-picker-stub')
		expect(picker.attributes('data-from')).toBe('2026-04-01T00:00:00.000Z')
		expect(picker.attributes('data-to')).toBe('2026-04-30T23:59:59.999Z')
		expect(picker.attributes('data-preset')).toBe('custom')
	})

	it('persisted state takes priority over explicit default', () => {
		localStorage.setItem('test.key', JSON.stringify({
			from: '2026-04-01T00:00:00.000Z',
			to: '2026-04-30T23:59:59.999Z',
			preset: 'custom',
		}))
		const wrapper = mount(CnDashboardPage, {
			propsData: {
				dateRange: {
					enabled: true,
					persistKey: 'test.key',
					default: {
						from: '2026-01-01T00:00:00.000Z',
						to: '2026-01-31T23:59:59.999Z',
						preset: 'custom',
					},
				},
				layout: [], widgets: [],
			},
			stubs,
		})
		const picker = wrapper.find('.cn-date-range-picker-stub')
		expect(picker.attributes('data-from')).toBe('2026-04-01T00:00:00.000Z')
	})

	it('emits date-range-change on mount when feature is enabled', () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { dateRange: { enabled: true }, layout: [], widgets: [] },
			stubs,
		})
		const events = wrapper.emitted('date-range-change')
		expect(events).toBeTruthy()
		expect(events.length).toBe(1)
		expect(events[0][0]).toMatchObject({ preset: 'last-7' })
	})

	it('does NOT emit date-range-change when feature is disabled', () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { layout: [], widgets: [] },
			stubs,
		})
		expect(wrapper.emitted('date-range-change')).toBeUndefined()
	})

	it('propagates picker input: emit + persist + update', async () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: {
				dateRange: { enabled: true, persistKey: 'test.key' },
				layout: [], widgets: [],
			},
			stubs,
		})
		const picker = wrapper.findComponent({ name: 'CnDateRangePicker' })
		const newRange = {
			from: '2026-05-01T00:00:00.000Z',
			to: '2026-05-31T23:59:59.999Z',
			preset: 'last-30',
		}
		picker.vm.$emit('input', newRange)
		await wrapper.vm.$nextTick()

		// Emitted
		const events = wrapper.emitted('date-range-change')
		expect(events.length).toBe(2) // initial + this one
		expect(events[1][0]).toEqual(newRange)

		// Persisted
		const stored = JSON.parse(localStorage.getItem('test.key'))
		expect(stored).toEqual(newRange)

		// Picker rebound (currentRange data updated)
		const refreshed = wrapper.find('.cn-date-range-picker-stub')
		expect(refreshed.attributes('data-preset')).toBe('last-30')
	})

	it('storage write failure is non-fatal', async () => {
		const orig = Storage.prototype.setItem
		Storage.prototype.setItem = jest.fn(() => {
			throw new Error('quota exceeded')
		})
		try {
			const wrapper = mount(CnDashboardPage, {
				propsData: {
					dateRange: { enabled: true, persistKey: 'test.key' },
					layout: [], widgets: [],
				},
				stubs,
			})
			const picker = wrapper.findComponent({ name: 'CnDateRangePicker' })
			expect(() => picker.vm.$emit('input', {
				from: '2026-01-01T00:00:00.000Z',
				to: '2026-01-31T23:59:59.999Z',
				preset: 'custom',
			})).not.toThrow()
			await wrapper.vm.$nextTick()
			// Event STILL emits even if storage failed.
			expect(wrapper.emitted('date-range-change').length).toBe(2)
		} finally {
			Storage.prototype.setItem = orig
		}
	})

	it('invalid persisted JSON is ignored, falls back to last-7', () => {
		localStorage.setItem('test.key', 'not json')
		const wrapper = mount(CnDashboardPage, {
			propsData: {
				dateRange: { enabled: true, persistKey: 'test.key' },
				layout: [], widgets: [],
			},
			stubs,
		})
		expect(wrapper.find('.cn-date-range-picker-stub').attributes('data-preset'))
			.toBe('last-7')
	})

	it('always provides cnDashboardDateRange ref (null value when disabled)', () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { layout: [], widgets: [] },
			stubs,
		})
		// Vue 2.7 stores provides on the component instance under
		// `_provided`. The ref is provided unconditionally; when the
		// feature is off, ref.value stays null.
		const provided = wrapper.vm._provided.cnDashboardDateRange
		expect(provided).toBeDefined()
		expect(provided.value).toBeNull()
	})

	it('provides reactive ref that updates on picker input when enabled', async () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { dateRange: { enabled: true }, layout: [], widgets: [] },
			stubs,
		})
		const provided = wrapper.vm._provided.cnDashboardDateRange
		// After mount, last-7 was assigned.
		expect(provided.value).not.toBeNull()
		expect(provided.value.preset).toBe('last-7')

		// Drive a picker change → provided ref updates.
		const picker = wrapper.findComponent({ name: 'CnDateRangePicker' })
		picker.vm.$emit('input', {
			from: '2026-06-01T00:00:00.000Z',
			to: '2026-06-30T23:59:59.999Z',
			preset: 'last-30',
		})
		await wrapper.vm.$nextTick()
		expect(provided.value.preset).toBe('last-30')
		expect(provided.value.from).toBe('2026-06-01T00:00:00.000Z')
	})

	describe('formatChartDateRange — friendly compact label', () => {
		// getWidgetDataSource resolves the bucket from the widget DEFINITION
		// (widgetMap keyed by w.id), not from the layout item — so register
		// the widget with its staticRange and reference it by id.
		const mountPageWithRange = (from, to, id = 'calls') => mount(CnDashboardPage, {
			propsData: {
				dateRange: { enabled: true },
				layout: [],
				widgets: [{ id, dataSource: { bucket: { staticRange: { from, to } } } }],
			},
			stubs,
		})
		const thisYear = new Date().getFullYear()

		it('renders a day-month range with an en-dash separator (same year)', () => {
			const wrapper = mountPageWithRange(`${thisYear}-05-18T00:00:00.000Z`, `${thisYear}-05-25T23:59:59.999Z`)
			const label = wrapper.vm.formatChartDateRange({ widgetId: 'calls' })
			// Not the old raw ISO "YYYY-05-18 → YYYY-05-25" form.
			expect(label).not.toContain(`${thisYear}-05-18`)
			expect(label).toContain(' – ')
			// Day number + short month on each side (order is locale-dependent:
			// "18 May – 25 May" or "May 18 – May 25"); year omitted same-year.
			const [leftSide, rightSide] = label.split(' – ')
			for (const side of [leftSide, rightSide]) {
				expect(side).toMatch(/\d{1,2}/) // a day number
				expect(side).toMatch(/\p{L}{3,}/u) // a month name
			}
			expect(label).not.toContain(String(thisYear))
		})

		it('includes the year when a bound falls outside the current year', () => {
			const wrapper = mountPageWithRange('2020-12-18T00:00:00.000Z', '2021-01-02T23:59:59.999Z')
			const label = wrapper.vm.formatChartDateRange({ widgetId: 'calls' })
			expect(label).toMatch(/2020/)
			expect(label).toMatch(/2021/)
			expect(label).toContain(' – ')
		})

		it('returns null when neither bound resolves', () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: { dateRange: { enabled: true }, layout: [], widgets: [{ id: 'x', dataSource: { bucket: {} } }] },
				stubs,
			})
			expect(wrapper.vm.formatChartDateRange({ widgetId: 'x' })).toBeNull()
		})
	})
})

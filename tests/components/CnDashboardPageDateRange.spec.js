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

// Apexcharts is stubbed globally via jest.config.js moduleNameMapper.

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

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
				layout: [],
				widgets: [],
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
				layout: [],
				widgets: [],
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
				layout: [],
				widgets: [],
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
				layout: [],
				widgets: [],
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
					layout: [],
					widgets: [],
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
				layout: [],
				widgets: [],
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
		// `$.provides`. The ref is provided unconditionally; when the
		// feature is off, ref.value stays null.
		const provided = wrapper.vm.$.provides.cnDashboardDateRange
		expect(provided).toBeDefined()
		expect(provided.value).toBeNull()
	})

	it('provides reactive ref that updates on picker input when enabled', async () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { dateRange: { enabled: true }, layout: [], widgets: [] },
			stubs,
		})
		const provided = wrapper.vm.$.provides.cnDashboardDateRange
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

	describe('chip preset pick (regression: preset.id, not preset.value)', () => {
		const mountPage = () => mount(CnDashboardPage, {
			propsData: { dateRange: { enabled: true }, layout: [], widgets: [] },
			stubs,
		})

		it('clicking a preset updates the current range (was a no-op when keyed by .value)', () => {
			const wrapper = mountPage()
			const before = { ...wrapper.vm.currentRange }
			wrapper.vm.onChipPresetPick({ id: 'last-30', label: 'Last 30 days', days: 30 })
			const after = wrapper.vm.currentRange
			expect(after.preset).toBe('last-30')
			expect(after.from).not.toBe(before.from)
		})

		it('an hour preset resolves a rolling window', () => {
			const wrapper = mountPage()
			wrapper.vm.onChipPresetPick({ id: 'last-8h', label: 'Last 8 hours', hours: 8 })
			expect(wrapper.vm.currentRange.preset).toBe('last-8h')
			const span = new Date(wrapper.vm.currentRange.to).getTime() - new Date(wrapper.vm.currentRange.from).getTime()
			expect(span).toBeCloseTo(8 * 3600000, -3)
		})

		it('custom preset is a no-op (keeps editing manually)', () => {
			const wrapper = mountPage()
			const before = { ...wrapper.vm.currentRange }
			wrapper.vm.onChipPresetPick({ id: 'custom', label: 'Custom range', days: null })
			expect(wrapper.vm.currentRange.from).toBe(before.from)
		})
	})

	describe('chip datetime round-trip (#5 time selection)', () => {
		const mountPage = () => mount(CnDashboardPage, {
			propsData: { dateRange: { enabled: true }, layout: [], widgets: [] },
			stubs,
		})

		// NcActionInput's date types are backed by a picker whose model is
		// typed `Date`; it renders EMPTY for a string and emits a `Date`
		// back. These assert that contract at the boundary — the previous
		// round-trip test only compared the two helpers against each other,
		// so it stayed green while the popover showed two blank fields.
		it('toPickerDate returns a Date the picker model accepts', () => {
			const wrapper = mountPage()
			const value = wrapper.vm.toPickerDate('2026-05-19T08:30:00.000Z')
			expect(value).toBeInstanceOf(Date)
			expect(value.toISOString()).toBe('2026-05-19T08:30:00.000Z')
		})

		it('onChipDateInput accepts the Date the picker emits', () => {
			const wrapper = mountPage()
			wrapper.vm.onChipDateInput('from', new Date('2026-05-19T08:30:00.000Z'))
			expect(wrapper.vm.currentRange.preset).toBe('custom')
			expect(wrapper.vm.currentRange.from).toBe('2026-05-19T08:30:00.000Z')
		})

		it('onChipDateInput preserves the other half instead of clearing it', () => {
			const wrapper = mountPage()
			wrapper.vm.onChipDateInput('to', new Date('2026-05-30T00:00:00.000Z'))
			// Assert the concrete stored instant, not just "unchanged" — an
			// unhandled payload writes '' to BOTH halves, which an
			// equality-to-previous check would have accepted as preserved.
			expect(wrapper.vm.currentRange.to).toBe('2026-05-30T00:00:00.000Z')
			wrapper.vm.onChipDateInput('from', new Date('2026-05-19T08:30:00.000Z'))
			expect(wrapper.vm.currentRange.to).toBe('2026-05-30T00:00:00.000Z')
			expect(wrapper.vm.currentRange.from).toBe('2026-05-19T08:30:00.000Z')
		})

		it('onChipDateInput still accepts a local string / input Event', () => {
			const wrapper = mountPage()
			wrapper.vm.onChipDateInput('from', { target: { value: '2026-05-19T10:30' } })
			expect(wrapper.vm.currentRange.from)
				.toBe(new Date('2026-05-19T10:30').toISOString())
		})

		it('toPickerDate returns null for null / bad input', () => {
			const wrapper = mountPage()
			expect(wrapper.vm.toPickerDate('')).toBeNull()
			expect(wrapper.vm.toPickerDate('not-a-date')).toBeNull()
		})
	})

	describe('manifest starting range by preset (#2)', () => {
		it('resolves dateRange.default.preset into a window when from/to omitted', () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: { dateRange: { enabled: true, default: { preset: 'last-30' } }, layout: [], widgets: [] },
				stubs,
			})
			expect(wrapper.vm.currentRange.preset).toBe('last-30')
			expect(wrapper.vm.currentRange.from).toMatch(/^\d{4}-\d{2}-\d{2}T/)
			expect(wrapper.vm.currentRange.to).toMatch(/^\d{4}-\d{2}-\d{2}T/)
		})

		it('explicit from/to default still wins over preset resolution', () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: {
					dateRange: {
						enabled: true,
						default: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T23:59:59.999Z', preset: 'custom' },
					},
					layout: [],
					widgets: [],
				},
				stubs,
			})
			expect(wrapper.vm.currentRange.from).toBe('2026-01-01T00:00:00.000Z')
			expect(wrapper.vm.currentRange.preset).toBe('custom')
		})
	})

	describe('pills control mode (control: "pills")', () => {
		const pillsPresets = [
			{ id: 'week', label: 'Last 7 days', days: 7 },
			{ id: 'month', label: 'Last 30 days', days: 30 },
			{ id: 'quarter', label: 'Last 90 days', days: 90 },
			{ id: 'custom', label: 'Custom range', days: null },
		]
		// Stub NcActions / NcActionInput so the custom-range popover pill mounts.
		const pillStubs = {
			...stubs,
			NcActions: { template: '<div class="nc-actions-stub"><slot name="icon" /><slot /></div>' },
			NcActionInput: { template: '<div class="nc-action-input-stub" />' },
		}

		it('renders the pill row instead of CnDateRangePicker', () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: {
					dateRange: { enabled: true, control: 'pills', presets: pillsPresets, default: { preset: 'month' } },
					layout: [],
					widgets: [],
				},
				stubs: pillStubs,
			})
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-pills"]').exists()).toBe(true)
			expect(wrapper.find('.cn-date-range-picker-stub').exists()).toBe(false)
			// One pill per non-custom preset.
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-pill-week"]').exists()).toBe(true)
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-pill-month"]').exists()).toBe(true)
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-pill-quarter"]').exists()).toBe(true)
		})

		it('control omitted keeps the default picker (backwards compat)', () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: {
					dateRange: { enabled: true, presets: pillsPresets, default: { preset: 'month' } },
					layout: [],
					widgets: [],
				},
				stubs: pillStubs,
			})
			expect(wrapper.find('.cn-date-range-picker-stub').exists()).toBe(true)
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-pills"]').exists()).toBe(false)
		})

		it('marks the active preset pill with aria-pressed="true"', () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: {
					dateRange: { enabled: true, control: 'pills', presets: pillsPresets, default: { preset: 'month' } },
					layout: [],
					widgets: [],
				},
				stubs: pillStubs,
			})
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-pill-month"]').attributes('aria-pressed')).toBe('true')
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-pill-week"]').attributes('aria-pressed')).toBe('false')
		})

		it('clicking a pill resolves the window, emits date-range-change, and updates active state', async () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: {
					dateRange: { enabled: true, control: 'pills', presets: pillsPresets, default: { preset: 'month' } },
					layout: [],
					widgets: [],
				},
				stubs: pillStubs,
			})
			await wrapper.find('[data-testid="cn-dashboard-page-date-pill-quarter"]').trigger('click')
			expect(wrapper.vm.currentRange.preset).toBe('quarter')
			expect(wrapper.vm.currentRange.from).toMatch(/^\d{4}-\d{2}-\d{2}T/)
			expect(wrapper.vm.currentRange.to).toMatch(/^\d{4}-\d{2}-\d{2}T/)
			const events = wrapper.emitted('date-range-change')
			expect(events[events.length - 1][0].preset).toBe('quarter')
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-pill-quarter"]').attributes('aria-pressed')).toBe('true')
		})

		it('exposes a Custom range popover pill when a custom preset exists', () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: {
					dateRange: { enabled: true, control: 'pills', presets: pillsPresets, default: { preset: 'month' } },
					layout: [],
					widgets: [],
				},
				stubs: pillStubs,
			})
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-pill-custom"]').exists()).toBe(true)
			expect(wrapper.vm.hasCustomPreset).toBe(true)
			// pillPresets excludes the custom entry (it surfaces as the popover).
			expect(wrapper.vm.pillPresets.map((p) => p.id)).toEqual(['week', 'month', 'quarter'])
		})
	})

	describe('workspace-context publishing + All/clear preset', () => {
		// `days: null` non-custom preset = an "All" / clear option.
		const presetsWithAll = [
			{ id: 'last-7', label: '7d', days: 7 },
			{ id: 'last-30', label: '30d', days: 30 },
			{ id: 'all', label: 'All', days: null },
			{ id: 'custom', label: 'Custom range', days: null },
		]
		const pillStubs = {
			...stubs,
			NcActions: { template: '<div class="nc-actions-stub"><slot name="icon" /><slot /></div>' },
			NcActionInput: { template: '<div class="nc-action-input-stub" />' },
		}

		it('publishes dateFrom / dateTo / datePreset into cnWorkspaceContext on init', () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: { dateRange: { enabled: true }, layout: [], widgets: [] },
				stubs,
			})
			const ctx = wrapper.vm.workspaceContext
			expect(ctx.datePreset).toBe('last-7')
			expect(ctx.dateFrom).toBe(wrapper.vm.currentRange.from)
			expect(ctx.dateTo).toBe(wrapper.vm.currentRange.to)
		})

		it('updates cnWorkspaceContext when the range changes', async () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: { dateRange: { enabled: true }, layout: [], widgets: [] },
				stubs,
			})
			wrapper.vm.onChipPresetPick({ id: 'last-30', label: '30d', days: 30 })
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.workspaceContext.datePreset).toBe('last-30')
			expect(wrapper.vm.workspaceContext.dateFrom).toBe(wrapper.vm.currentRange.from)
		})

		it('isClearPreset flags a non-custom days:null preset (not custom)', () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: { dateRange: { enabled: true }, layout: [], widgets: [] },
				stubs,
			})
			expect(wrapper.vm.isClearPreset({ id: 'all', days: null })).toBe(true)
			expect(wrapper.vm.isClearPreset({ id: 'custom', days: null })).toBe(false)
			expect(wrapper.vm.isClearPreset({ id: 'last-7', days: 7 })).toBe(false)
			expect(wrapper.vm.isClearPreset({ id: 'x', clear: true, days: 7 })).toBe(true)
		})

		it('clicking the All pill clears the window and the workspace bounds', async () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: {
					dateRange: { enabled: true, control: 'pills', presets: presetsWithAll, default: { preset: 'last-30' } },
					layout: [],
					widgets: [],
				},
				stubs: pillStubs,
			})
			// Starts with a bounded window.
			expect(wrapper.vm.workspaceContext.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}T/)
			await wrapper.find('[data-testid="cn-dashboard-page-date-pill-all"]').trigger('click')
			expect(wrapper.vm.currentRange.preset).toBe('all')
			expect(wrapper.vm.workspaceContext.dateFrom).toBe('')
			expect(wrapper.vm.workspaceContext.dateTo).toBe('')
		})

		it('default preset "all" starts unbounded (empty workspace bounds)', () => {
			const wrapper = mount(CnDashboardPage, {
				propsData: {
					dateRange: { enabled: true, control: 'pills', presets: presetsWithAll, default: { preset: 'all' } },
					layout: [],
					widgets: [],
				},
				stubs: pillStubs,
			})
			expect(wrapper.vm.currentRange.preset).toBe('all')
			expect(wrapper.vm.workspaceContext.dateFrom).toBe('')
		})
	})

	describe('per-widget date chip (layout[].dateChip) — abstract KPI card select', () => {
		const presetsWithAll = [
			{ id: 'last-7', label: '7d', days: 7 },
			{ id: 'last-30', label: '30d', days: 30 },
			{ id: 'all', label: 'All', days: null },
		]
		const chipStubs = {
			...stubs,
			// The default grid stub renders no slot — render it so widget bodies
			// (and their in-header chips) actually mount.
			CnDashboardGrid: { template: '<div class="cn-dashboard-grid-stub"><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
			// The default CnWidgetWrapper stub drops named slots — render title-meta
			// so the in-header date chip is visible to the assertions.
			CnWidgetWrapper: { template: '<div><slot name="title-meta" /><slot /></div>' },
			NcActions: { template: '<div class="nc-actions-stub"><slot name="icon" /><slot /></div>' },
			NcActionButton: { template: '<button class="nc-action-button-stub"><slot name="icon" /><slot /></button>' },
			NcActionInput: { template: '<div class="nc-action-input-stub" />' },
			NcActionSeparator: { template: '<div />' },
		}
		const mountWithChip = (defaultPreset) => mount(CnDashboardPage, {
			propsData: {
				dateRange: { enabled: true, showHeaderPicker: false, presets: presetsWithAll, default: { preset: defaultPreset } },
				widgets: [{ id: 'kpi', type: 'custom', title: 'Decisions' }],
				layout: [{ id: '1', widgetId: 'kpi', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2, showTitle: true, dateChip: true }],
			},
			stubs: chipStubs,
			scopedSlots: { 'widget-kpi': '<div class="kpi-body" />' },
		})

		it('dashboardRangeChipLabel prefers the active preset label', () => {
			const wrapper = mountWithChip('last-30')
			expect(wrapper.vm.dashboardRangeChipLabel).toBe('30d')
		})

		it('chip renders on a dateChip widget and shows the preset label', () => {
			const wrapper = mountWithChip('last-7')
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-chip-kpi"]').exists()).toBe(true)
			expect(wrapper.find('.cn-dashboard-page__date-chip').text()).toBe('7d')
		})

		it('chip STILL renders (label "All") when the range is unbounded', () => {
			const wrapper = mountWithChip('all')
			expect(wrapper.vm.currentRange.preset).toBe('all')
			expect(wrapper.find('[data-testid="cn-dashboard-page-date-chip-kpi"]').exists()).toBe(true)
			expect(wrapper.find('.cn-dashboard-page__date-chip').text()).toBe('All')
		})

		it('picking the All entry in the chip clears the window', async () => {
			const wrapper = mountWithChip('last-7')
			expect(wrapper.vm.workspaceContext.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}T/)
			wrapper.vm.onChipPresetPick({ id: 'all', label: 'All', days: null }, { widgetId: 'kpi' })
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.currentRange.preset).toBe('all')
			expect(wrapper.vm.workspaceContext.dateFrom).toBe('')
		})
	})
})

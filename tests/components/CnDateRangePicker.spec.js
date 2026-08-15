/**
 * Tests for CnDateRangePicker.
 *
 * Covers preset window resolution, manual edits switching the preset
 * id to `custom`, the disabled prop forwarding, and the default
 * preset list shape.
 */

import { mount } from '@vue/test-utils'
import CnDateRangePicker, {
	DEFAULT_DATE_RANGE_PRESETS,
	resolvePresetWindow,
} from '@/components/CnDateRangePicker/CnDateRangePicker.vue'

const stubs = {
	NcDateTimePicker: {
		name: 'NcDateTimePicker',
		template: '<input class="nc-date-time-picker-stub" :data-value="value && value.toISOString()" :disabled="disabled" />',
		props: ['value', 'disabled', 'format'],
	},
	NcSelect: {
		name: 'NcSelect',
		template: '<select class="nc-select-stub" :disabled="disabled"></select>',
		props: ['value', 'options', 'disabled', 'clearable', 'searchable', 'label'],
	},
}

describe('resolvePresetWindow', () => {
	const presets = DEFAULT_DATE_RANGE_PRESETS

	it('returns null for custom preset', () => {
		expect(resolvePresetWindow('custom', presets)).toBeNull()
	})

	it('returns null for unknown preset id', () => {
		expect(resolvePresetWindow('decade', presets)).toBeNull()
	})

	it('returns null for null input', () => {
		expect(resolvePresetWindow(null, presets)).toBeNull()
		expect(resolvePresetWindow('', presets)).toBeNull()
	})

	it('today resolves to one UTC day window', () => {
		const now = new Date('2026-05-21T10:00:00Z')
		const w = resolvePresetWindow('today', presets, now)
		expect(w.from).toBe('2026-05-21T00:00:00.000Z')
		expect(w.to).toBe('2026-05-21T23:59:59.999Z')
	})

	it('last-7 resolves to 7-day UTC window ending today', () => {
		const now = new Date('2026-05-21T10:00:00Z')
		const w = resolvePresetWindow('last-7', presets, now)
		// 7 days inclusive: 2026-05-15 → 2026-05-21
		expect(w.from).toBe('2026-05-15T00:00:00.000Z')
		expect(w.to).toBe('2026-05-21T23:59:59.999Z')
	})

	it('last-30 spans 30 days', () => {
		const now = new Date('2026-05-21T10:00:00Z')
		const w = resolvePresetWindow('last-30', presets, now)
		const fromDate = new Date(w.from)
		const toDate = new Date(w.to)
		const ms = toDate.getTime() - fromDate.getTime()
		// 30 days inclusive = 30*24h - 1ms boundary
		const days = ms / (24 * 60 * 60 * 1000)
		expect(days).toBeCloseTo(30 - (1 / (24 * 60 * 60 * 1000)), 5)
	})

	it('honours the consumer-supplied preset list', () => {
		const custom = [{ id: 'last-365', label: 'Last year', days: 365 }]
		const now = new Date('2026-05-21T10:00:00Z')
		const w = resolvePresetWindow('last-365', custom, now)
		expect(w).not.toBeNull()
		expect(w.to).toBe('2026-05-21T23:59:59.999Z')
	})

	describe('calendar-aligned `period` presets', () => {
		// A `period` preset means the CURRENT calendar unit to date. These
		// windows must NOT equal the rolling `days` equivalents — that
		// difference is the whole point of the kind.
		const periods = [
			{ id: 'week', label: 'Current week', period: 'week' },
			{ id: 'month', label: 'Current month', period: 'month' },
			{ id: 'quarter', label: 'Current quarter', period: 'quarter' },
			{ id: 'year', label: 'Current year', period: 'year' },
		]
		// Thursday 21 May 2026 — mid-week, mid-month, mid-Q2.
		const now = new Date('2026-05-21T10:00:00Z')

		it('week starts on the Monday of the current ISO week', () => {
			const w = resolvePresetWindow('week', periods, now)
			expect(w.from).toBe('2026-05-18T00:00:00.000Z')
			expect(w.to).toBe('2026-05-21T23:59:59.999Z')
		})

		it('week starting on a Sunday still anchors to the previous Monday', () => {
			const sunday = new Date('2026-05-24T10:00:00Z')
			const w = resolvePresetWindow('week', periods, sunday)
			expect(w.from).toBe('2026-05-18T00:00:00.000Z')
		})

		it('month starts on the 1st of the current month', () => {
			const w = resolvePresetWindow('month', periods, now)
			expect(w.from).toBe('2026-05-01T00:00:00.000Z')
			expect(w.to).toBe('2026-05-21T23:59:59.999Z')
		})

		it('quarter starts on the first day of the current quarter', () => {
			const w = resolvePresetWindow('quarter', periods, now)
			expect(w.from).toBe('2026-04-01T00:00:00.000Z')
		})

		it('year starts on 1 January', () => {
			const w = resolvePresetWindow('year', periods, now)
			expect(w.from).toBe('2026-01-01T00:00:00.000Z')
		})

		// Positive control: prove the period window genuinely differs from the
		// rolling window it replaces, so a regression to `days` fails loudly.
		it('month does NOT resolve to the rolling last-30-days window', () => {
			const period = resolvePresetWindow('month', periods, now)
			const rolling = resolvePresetWindow(
				'roll', [{ id: 'roll', label: 'Last 30 days', days: 30 }], now,
			)
			expect(period.from).not.toBe(rolling.from)
		})

		it('ignores a legacy `days` hint when `period` is present', () => {
			const both = [{ id: 'month', label: 'Current month', period: 'month', days: 30 }]
			const w = resolvePresetWindow('month', both, now)
			expect(w.from).toBe('2026-05-01T00:00:00.000Z')
		})

		it('returns null for an unknown period value', () => {
			const bad = [{ id: 'decade', label: 'Decade', period: 'decade' }]
			expect(resolvePresetWindow('decade', bad, now)).toBeNull()
		})
	})

	it('last-8h resolves to a rolling 8-hour window ending at now (exact time)', () => {
		const now = new Date('2026-05-21T10:30:00Z')
		const w = resolvePresetWindow('last-8h', presets, now)
		// Rolling, not day-aligned: to = now exactly, from = now - 8h
		expect(w.to).toBe('2026-05-21T10:30:00.000Z')
		expect(w.from).toBe('2026-05-21T02:30:00.000Z')
	})

	it('last-24h resolves to a rolling 24-hour window ending at now', () => {
		const now = new Date('2026-05-21T10:30:00Z')
		const w = resolvePresetWindow('last-24h', presets, now)
		expect(w.to).toBe('2026-05-21T10:30:00.000Z')
		expect(w.from).toBe('2026-05-20T10:30:00.000Z')
	})

	it('DEFAULT_DATE_RANGE_PRESETS includes the hour presets', () => {
		const ids = DEFAULT_DATE_RANGE_PRESETS.map((p) => p.id)
		expect(ids).toContain('last-8h')
		expect(ids).toContain('last-24h')
	})
})

describe('CnDateRangePicker', () => {
	const baseValue = {
		from: '2026-05-15T00:00:00.000Z',
		to: '2026-05-21T23:59:59.999Z',
		preset: 'last-7',
	}

	it('renders preset select + two pickers', () => {
		const wrapper = mount(CnDateRangePicker, {
			propsData: { value: baseValue },
			stubs,
		})
		expect(wrapper.find('[data-testid="cn-date-range-picker"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-date-range-picker-from"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-date-range-picker-to"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-date-range-picker-preset"]').exists()).toBe(true)
	})

	it('selecting a non-custom preset auto-fills the window', async () => {
		const wrapper = mount(CnDateRangePicker, {
			propsData: { value: baseValue },
			stubs,
		})
		// @nextcloud/vue's Vue-3 line renamed NcSelect's v-model channel from
		// `value`/`input` to `modelValue`/`update:modelValue`, so the component
		// now listens on `@update:model-value` — emitting the old `input` here
		// would reach no handler at all.
		wrapper.findComponent({ name: 'NcSelect' }).vm.$emit('update:model-value', { id: 'today', label: 'Today', days: 1 })
		await wrapper.vm.$nextTick()
		const events = wrapper.emitted('input')
		expect(events).toBeTruthy()
		expect(events[0][0].preset).toBe('today')
		expect(events[0][0].from).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/)
		expect(events[0][0].to).toMatch(/^\d{4}-\d{2}-\d{2}T23:59:59\.999Z$/)
	})

	it('selecting custom preserves the current window', async () => {
		const wrapper = mount(CnDateRangePicker, {
			propsData: { value: baseValue },
			stubs,
		})
		// See above: NcSelect's Vue-3 v-model channel is `update:modelValue`.
		wrapper.findComponent({ name: 'NcSelect' }).vm.$emit('update:model-value', { id: 'custom', label: 'Custom', days: null })
		await wrapper.vm.$nextTick()
		const event = wrapper.emitted('input')[0][0]
		expect(event.preset).toBe('custom')
		expect(event.from).toBe(baseValue.from)
		expect(event.to).toBe(baseValue.to)
	})

	it('manual from-edit flips preset to custom and uses start-of-day UTC', async () => {
		const wrapper = mount(CnDateRangePicker, {
			propsData: { value: baseValue },
			stubs,
		})
		const fromPicker = wrapper.findAllComponents({ name: 'NcDateTimePicker' }).at(0)
		fromPicker.vm.$emit('change', new Date('2026-03-15T08:30:00Z'))
		await wrapper.vm.$nextTick()
		const event = wrapper.emitted('input')[0][0]
		expect(event.preset).toBe('custom')
		expect(event.from).toBe('2026-03-15T00:00:00.000Z')
		expect(event.to).toBe(baseValue.to)
	})

	it('manual to-edit uses end-of-day UTC', async () => {
		const wrapper = mount(CnDateRangePicker, {
			propsData: { value: baseValue },
			stubs,
		})
		const toPicker = wrapper.findAllComponents({ name: 'NcDateTimePicker' }).at(1)
		toPicker.vm.$emit('change', new Date('2026-03-20T08:30:00Z'))
		await wrapper.vm.$nextTick()
		const event = wrapper.emitted('input')[0][0]
		expect(event.preset).toBe('custom')
		expect(event.from).toBe(baseValue.from)
		expect(event.to).toBe('2026-03-20T23:59:59.999Z')
	})

	it('disabled prop forwards to both pickers and the preset select', () => {
		const wrapper = mount(CnDateRangePicker, {
			propsData: { value: baseValue, disabled: true },
			stubs,
		})
		const pickers = wrapper.findAllComponents({ name: 'NcDateTimePicker' })
		expect(pickers.at(0).props('disabled')).toBe(true)
		expect(pickers.at(1).props('disabled')).toBe(true)
		expect(wrapper.findComponent({ name: 'NcSelect' }).props('disabled')).toBe(true)
	})

	it('null value renders empty pickers without errors', () => {
		const wrapper = mount(CnDateRangePicker, {
			propsData: { value: null },
			stubs,
		})
		// Should not throw; selectedPresetId falls back to 'custom'.
		expect(wrapper.find('[data-testid="cn-date-range-picker"]').exists()).toBe(true)
	})
})

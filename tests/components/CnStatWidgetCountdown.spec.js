/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatWidget: the countdown display mode.
 *
 * The concrete need is dossiq's case page, whose top row must be three real
 * KPI tiles rather than one hand-written component: the case type, the status
 * as a badge, and the deadline as a countdown. The first two already ship. The
 * six decisions this file pins are the ones a deadline tile gets wrong when
 * nobody writes them down: a passed date shown as a negative number, today
 * shown as one or minus one, `NaN` where a missing date belongs, a threshold
 * that misses its own boundary, a record override losing to a deadline colour,
 * and a time of day silently moving the answer by a day.
 */
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

// A fixed "now", named in LOCAL terms so the fixture means the same thing in
// every zone the suite might run in.
const NOW = new Date(2026, 8, 12, 12, 0, 0)

/**
 * An ISO `YYYY-MM-DD` string for a local calendar day `offset` days from NOW.
 *
 * @param {number} offset Days from today; negative is in the past.
 * @return {string} The date-only string.
 */
function day(offset) {
	const d = new Date(2026, 8, 12 + offset)
	const pad = (n) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Mount a countdown tile on a detail page bound to `record`.
 *
 * @param {object} countdown The `content.countdown` block.
 * @param {object} record The bound record.
 * @param {object} extra Extra `content` keys.
 * @return {object} The wrapper.
 */
function mountDeadline(countdown, record, extra = {}) {
	return mount(CnStatWidget, {
		props: {
			content: {
				label: 'Deadline',
				display: 'countdown',
				objectField: 'dueDate',
				countdown,
				...extra,
			},
		},
		global: {
			provide: {
				cnObjectContext: ref({ objectId: 'case-1', object: record, register: 'dossiq', schema: 'case' }),
			},
		},
	})
}

/**
 * The text the tile's value element shows.
 *
 * @param {object} wrapper The mounted tile.
 * @return {string} The rendered value text.
 */
function shown(wrapper) {
	return wrapper.find('.cn-stat-widget__value').text()
}

beforeEach(() => {
	jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] })
	jest.setSystemTime(NOW)
})

afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

describe('CnStatWidget: the countdown renders the days remaining', () => {
	it('shows the days left for a date still to come', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: day(14) })

		expect(shown(w)).toBe('14 days left')
		expect(w.vm.countdownDays).toBe(14)
	})

	it('marks itself so a page can find it', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: day(14) })
		expect(w.find('[data-testid="cn-stat-widget-countdown"]').exists()).toBe(true)
	})

	it('carries its own singular, so one day is not "1 days left"', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: day(1) })
		expect(shown(w)).toBe('1 day left')
	})

	it('lets a manifest word the future itself', () => {
		const w = mountDeadline({ futureLabel: 'Nog {n} dagen' }, { dueDate: day(9) })
		expect(shown(w)).toBe('Nog 9 dagen')
	})

	it('leaves an ordinary tile untouched when display is not countdown', () => {
		const w = mount(CnStatWidget, {
			props: { content: { objectField: 'dueDate', countdown: { warnAt: 14 } } },
			global: { provide: { cnObjectContext: ref({ objectId: 'c', object: { dueDate: day(3) } }) } },
		})

		expect(shown(w)).toBe(day(3))
		expect(w.vm.countdownDays).toBeNull()
	})

	it('reads a date off an endpoint payload too, not only off the record', () => {
		const w = mount(CnStatWidget, {
			props: {
				content: {
					display: 'countdown',
					endpointSource: { url: '/apps/dossiq/api/case/1' },
					valueField: 'deadline',
					countdown: { unit: 'days' },
				},
			},
		})
		w.vm.epData = { deadline: day(3) }

		expect(w.vm.countdownText).toBe('3 days left')
	})
})

// DECISION 1. "-3 days left" is the failure this mode exists to prevent. A date
// that has gone by is read as overdue, in its own words, and in the danger
// colour whether or not a threshold was configured.
describe('CnStatWidget: a date that has passed', () => {
	it('reads as overdue, not as a negative number', () => {
		const w = mountDeadline({ pastLabel: 'Overdue by {n} days' }, { dueDate: day(-3) })

		expect(shown(w)).toBe('Overdue by 3 days')
		expect(shown(w)).not.toContain('-')
		expect(shown(w)).not.toContain('−')
	})

	it('has a default wording, so a tile that configures nothing still reads right', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: day(-3) })
		expect(shown(w)).toBe('Overdue by 3 days')
	})

	it('keeps the singular for one day past', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: day(-1) })
		expect(shown(w)).toBe('Overdue by 1 day')
	})

	it('is the danger colour even with no thresholds configured', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: day(-3) })

		expect(w.vm.countdownVariant).toBe('error')
		// jsdom drops `var()` colours from the style attribute, so the bound
		// style object is asserted, as CnStatWidgetVariantContrast does.
		expect(w.vm.valueStyle.color).toContain('--color-error-text')
	})

	it('stays the danger colour when the thresholds would have said warning', () => {
		const w = mountDeadline({ warnAt: 14, dangerAt: 5 }, { dueDate: day(-30) })
		expect(w.vm.countdownVariant).toBe('error')
	})
})

// DECISION 2. Today is zero. Not one, which would claim a day that is already
// being spent, and not minus one, which would call a deadline that has not
// passed overdue.
describe('CnStatWidget: a deadline due today', () => {
	it('counts today as zero', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: day(0) })
		expect(w.vm.countdownDays).toBe(0)
	})

	it('reads as "Today", not as "0 days left" and not as overdue', () => {
		const w = mountDeadline({ pastLabel: 'Overdue by {n} days' }, { dueDate: day(0) })

		expect(shown(w)).toBe('Today')
		expect(shown(w)).not.toContain('Overdue')
		expect(shown(w)).not.toContain('0')
	})

	it('lets a manifest word today itself', () => {
		const w = mountDeadline({ todayLabel: 'Vandaag' }, { dueDate: day(0) })
		expect(shown(w)).toBe('Vandaag')
	})

	it('is danger at zero when dangerAt is set, because zero is at or below it', () => {
		const w = mountDeadline({ warnAt: 14, dangerAt: 5 }, { dueDate: day(0) })
		expect(w.vm.countdownVariant).toBe('error')
	})
})

// DECISION 3. NaN and "Invalid Date" are never an answer a person should read.
describe('CnStatWidget: no readable date', () => {
	it.each([
		['absent', undefined],
		['null', null],
		['empty', ''],
		['unparseable', 'not yet planned'],
		['a boolean', true],
	])('shows emptyText for %s', (_name, value) => {
		const w = mountDeadline({ emptyText: 'No deadline' }, { dueDate: value })

		expect(shown(w)).toBe('No deadline')
		expect(shown(w)).not.toContain('NaN')
		expect(shown(w)).not.toContain('Invalid Date')
	})

	it('falls back to the top-level emptyText when the countdown names none', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: null }, { emptyText: 'Unknown' })
		expect(shown(w)).toBe('Unknown')
	})

	it('lets the countdown emptyText win over the top-level one', () => {
		const w = mountDeadline({ emptyText: 'No deadline' }, { dueDate: null }, { emptyText: 'Unknown' })
		expect(shown(w)).toBe('No deadline')
	})

	it('translates emptyText', () => {
		const w = mount(CnStatWidget, {
			props: {
				content: { display: 'countdown', objectField: 'dueDate', countdown: { emptyText: 'No deadline' } },
				translate: (s) => (s === 'No deadline' ? 'Geen deadline' : s),
			},
			global: { provide: { cnObjectContext: ref({ objectId: 'c', object: { dueDate: null } }) } },
		})
		expect(shown(w)).toBe('Geen deadline')
	})

	it('keeps the dash when nothing names an empty text', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: null })

		expect(shown(w)).toBe('—')
		expect(shown(w)).not.toContain('NaN')
	})

	it('takes no colour from a date it cannot read', () => {
		const w = mountDeadline({ warnAt: 14, dangerAt: 5, emptyText: 'No deadline' }, { dueDate: 'someday' })
		expect(w.vm.countdownVariant).toBe('')
	})
})

// DECISION 4. Both thresholds include their own day, and dangerAt is tested
// first, so exactly 5 with `dangerAt: 5` is danger and not warning.
describe('CnStatWidget: the thresholds', () => {
	const thresholds = { warnAt: 14, dangerAt: 5 }

	it.each([
		[20, ''],
		[15, ''],
		[14, 'warning'],
		[13, 'warning'],
		[6, 'warning'],
		[5, 'error'],
		[4, 'error'],
		[0, 'error'],
	])('%i days left is %s', (days, expected) => {
		const w = mountDeadline(thresholds, { dueDate: day(days) })
		expect(w.vm.countdownVariant).toBe(expected)
	})

	it('is danger, not warning, at exactly dangerAt when warnAt also matches', () => {
		const w = mountDeadline(thresholds, { dueDate: day(5) })

		expect(w.vm.countdownVariant).toBe('error')
		expect(w.vm.valueStyle.color).toContain('--color-error-text')
	})

	it('takes a warning colour from warnAt alone', () => {
		const w = mountDeadline({ warnAt: 14 }, { dueDate: day(14) })
		expect(w.vm.valueStyle.color).toContain('--color-warning-text')
	})

	it('colours nothing when no threshold is configured and the date is ahead', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: day(30) })

		expect(w.vm.countdownVariant).toBe('')
		expect(w.vm.valueStyle).toEqual({})
	})

	it('reads a cleared threshold as absent, not as zero', () => {
		// `dangerAt: 0` and no `dangerAt` are different configs. Only the first
		// may paint a tile due in a month, and neither does.
		const w = mountDeadline({ dangerAt: undefined, warnAt: undefined }, { dueDate: day(30) })
		expect(w.vm.countdownVariant).toBe('')
	})
})

// DECISION 5. An override describes the RECORD's state. A suspended case is
// not waiting for its deadline, so it reads and colours as suspended, exactly
// as it already does in badge mode.
describe('CnStatWidget: overrides still win', () => {
	const suspended = { when: { field: 'suspended' }, label: 'Suspended', variant: 'warning' }

	it('shows the override label instead of the countdown', () => {
		const w = mountDeadline({ warnAt: 14, dangerAt: 5 }, { dueDate: day(2), suspended: true }, { overrides: [suspended] })

		expect(shown(w)).toBe('Suspended')
		expect(shown(w)).not.toContain('days left')
	})

	it('shows the override colour instead of the deadline colour', () => {
		const w = mountDeadline({ warnAt: 14, dangerAt: 5 }, { dueDate: day(2), suspended: true }, { overrides: [suspended] })

		// The deadline alone would be `error` at two days left.
		expect(w.vm.countdownVariant).toBe('error')
		expect(w.vm.valueStyle.color).toContain('--color-warning-text')
	})

	it('leaves a case that is not suspended on its countdown', () => {
		const w = mountDeadline({ warnAt: 14, dangerAt: 5 }, { dueDate: day(2), suspended: false }, { overrides: [suspended] })

		expect(shown(w)).toBe('2 days left')
		expect(w.vm.valueStyle.color).toContain('--color-error-text')
	})

	it('outranks the countdown even for a passed date', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: day(-9), suspended: true }, { overrides: [suspended] })

		expect(shown(w)).toBe('Suspended')
		expect(w.vm.valueStyle.color).toContain('--color-warning-text')
	})

	it('lets an explicit variantWhen rule outrank the countdown, as it does elsewhere', () => {
		const w = mountDeadline(
			{ warnAt: 14, dangerAt: 5 },
			{ dueDate: day(2) },
			{ variantWhen: [{ op: 'eq', value: day(2), variant: 'primary' }] },
		)
		expect(w.vm.valueStyle.color).toContain('--color-primary-element')
	})
})

// DECISION 6. A deadline is a day on a calendar, not an instant. Comparing
// elapsed milliseconds makes 23:00 today and 01:00 tomorrow two hours apart
// while 09:00 tomorrow is a whole day, so the same calendar distance renders
// as two different answers because of a time somebody happened to type.
describe('CnStatWidget: calendar days, not elapsed time', () => {
	it('calls a deadline at 23:00 tonight today, because it is today', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: `${day(0)}T23:00:00` })

		expect(w.vm.countdownDays).toBe(0)
		expect(shown(w)).toBe('Today')
	})

	it('calls a deadline at 01:00 tomorrow one day, two hours later on the clock', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: `${day(1)}T01:00:00` })

		expect(w.vm.countdownDays).toBe(1)
		expect(shown(w)).toBe('1 day left')
	})

	it('gives the same answer for every hour of the same day', () => {
		const hours = ['00:00:00', '08:30:00', '12:00:00', '23:59:59']
		const answers = hours.map((h) => mountDeadline({}, { dueDate: `${day(7)}T${h}` }).vm.countdownDays)

		expect(answers).toEqual([7, 7, 7, 7])
	})

	it('counts whole days across a month boundary', () => {
		const w = mountDeadline({ unit: 'days' }, { dueDate: '2026-10-12' })
		expect(w.vm.countdownDays).toBe(30)
	})

	it('counts whole days over a long span whose deadline falls earlier in the day', () => {
		// 52 calendar days, but 51.5 elapsed ones, because the deadline is at
		// midnight and now is at noon. Dividing milliseconds answers 51.
		const w = mountDeadline({ unit: 'days' }, { dueDate: '2026-11-03T00:00:00' })
		expect(w.vm.countdownDays).toBe(52)
	})

	it('accepts a Date and an epoch timestamp as well as a string', () => {
		const due = new Date(2026, 8, 19, 6, 0, 0)

		expect(mountDeadline({}, { dueDate: due }).vm.countdownDays).toBe(7)
		expect(mountDeadline({}, { dueDate: due.getTime() }).vm.countdownDays).toBe(7)
	})
})

// The same decision, seen from the failure it prevents. `new Date('2026-09-13')`
// is specified to parse a DATE-ONLY string as UTC midnight, so west of
// Greenwich it lands on the 12th LOCAL and every countdown built on it is a day
// short. OpenRegister stores a date property in exactly that shape, so this is
// the everyday case, not an exotic one.
//
// The suite cannot simply switch zone to show it: `tests/globalSetup.js` pins
// `TZ=UTC` before any worker starts, on purpose and with its reasons written
// down, and Node caches the zone on first `Date` use, so a later assignment to
// `process.env.TZ` does nothing at all. A test that flips the variable and
// asserts afterwards passes whatever the code does, which is no test. So the
// zone is STOOD IN FOR instead: a `Date` whose local-component getters read
// four hours behind UTC is exactly what the failure needs to become visible.
describe('CnStatWidget: a date-only string read west of Greenwich', () => {
	const LOCAL_GETTERS = ['getFullYear', 'getMonth', 'getDate']
	let restore = null

	/**
	 * Stand in for a zone `hours` behind UTC by shifting what the local-component
	 * getters report. Parsing, `Date.UTC` and the fake clock are left exactly as
	 * they are, so the only thing under test is how a value is read back.
	 *
	 * The getters are patched on the prototype rather than by swapping the `Date`
	 * constructor: a subclass assigned to `global.Date` was not picked up at all
	 * here, and an emulation that quietly does nothing is the very thing this
	 * block exists to avoid.
	 *
	 * @param {number} hours How far behind UTC to stand.
	 * @return {void}
	 */
	function standWestOfGreenwich(hours) {
		const shift = hours * 3600000
		const proto = Date.prototype
		const original = {}
		for (const name of LOCAL_GETTERS) {
			original[name] = proto[name]
			const utcName = name.replace('get', 'getUTC')
			proto[name] = function shifted() {
				// A fresh instance, so the UTC getter below is the untouched one
				// and there is no recursion.
				return new Date(this.getTime() - shift)[utcName]()
			}
		}
		restore = () => {
			for (const name of LOCAL_GETTERS) {
				proto[name] = original[name]
			}
		}
	}

	beforeEach(() => {
		// New York in September. Noon local is 16:00 UTC, so "today" is the 12th
		// on both clocks and nothing but the deadline is in question.
		jest.setSystemTime(new Date(2026, 8, 12, 16, 0, 0))
		standWestOfGreenwich(4)
	})

	afterEach(() => {
		if (restore) {
			restore()
			restore = null
		}
	})

	it('proves the stand-in is actually standing west', () => {
		// Without this the three assertions below pass in a UTC process whatever
		// the component does, which is the shape of every test that cannot fail.
		expect(new Date(Date.UTC(2026, 8, 13, 0, 0, 0)).getDate()).toBe(12)
	})

	it('reads a bare YYYY-MM-DD as the local day it names, not as UTC midnight', () => {
		expect(mountDeadline({}, { dueDate: '2026-09-13' }).vm.countdownDays).toBe(1)
		expect(mountDeadline({}, { dueDate: '2026-09-12' }).vm.countdownDays).toBe(0)
		expect(mountDeadline({}, { dueDate: '2026-09-11' }).vm.countdownDays).toBe(-1)
	})

	it('does not call tomorrow today, which is what the UTC parse would do', () => {
		expect(shown(mountDeadline({}, { dueDate: '2026-09-13' }))).toBe('1 day left')
	})

	it('still reads a deadline late tonight as today', () => {
		expect(mountDeadline({}, { dueDate: '2026-09-12T23:30:00-04:00' }).vm.countdownDays).toBe(0)
	})
})

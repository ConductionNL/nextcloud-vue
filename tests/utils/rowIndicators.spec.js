/**
 * Tests for resolveRowIndicators (working-list-row-actions).
 *
 * The page declares which indicators exist and in what order. A record only
 * decides whether a declared indicator's condition holds. Nothing a record
 * carries adds an indicator the page has not declared.
 */

import { indicatorApplies, indicatorText, resolveRowIndicators } from '../../src/utils/rowIndicators.js'

const DECLARED = [
	{ id: 'suspended', field: 'suspended', icon: 'PauseCircleOutline', text: 'Suspended' },
	{ id: 'extended', field: 'extended', icon: 'ClockPlusOutline', text: 'Term extended' },
	{ id: 'child', field: 'parentCase', icon: 'FileTreeOutline', text: 'Part of a parent case' },
	{ id: 'decided', field: 'decision', icon: 'GavelOutline', text: 'Decision filed' },
]

describe('indicatorApplies', () => {
	it('reads truthiness when no condition is given', () => {
		expect(indicatorApplies(DECLARED[0], { suspended: true })).toBe(true)
		expect(indicatorApplies(DECLARED[0], { suspended: false })).toBe(false)
		expect(indicatorApplies(DECLARED[0], {})).toBe(false)
	})

	it('reads an exact value with equals', () => {
		const ind = { field: 'status', equals: 'open', text: 'Open' }
		expect(indicatorApplies(ind, { status: 'open' })).toBe(true)
		expect(indicatorApplies(ind, { status: 'closed' })).toBe(false)
	})

	it('reads a set with in', () => {
		const ind = { field: 'status', in: ['open', 'paused'], text: 'Live' }
		expect(indicatorApplies(ind, { status: 'paused' })).toBe(true)
		expect(indicatorApplies(ind, { status: 'closed' })).toBe(false)
	})

	it('reads a dotted path', () => {
		const ind = { field: '@self.locked', text: 'Locked' }
		expect(indicatorApplies(ind, { '@self': { locked: true } })).toBe(true)
		expect(indicatorApplies(ind, { '@self': {} })).toBe(false)
	})

	it('refuses an entry that names no field', () => {
		expect(indicatorApplies({ text: 'Nowhere' }, { anything: true })).toBe(false)
	})

	describe('a date bound', () => {
		const NOW = new Date(2026, 9, 20, 14, 0)
		const held = { id: 'held', field: 'heldUntil', after: 'now', text: 'On hold' }

		it('applies while the date is after now', () => {
			expect(indicatorApplies(held, { heldUntil: '2026-10-27' }, NOW)).toBe(true)
			expect(indicatorApplies(held, { heldUntil: '2026-10-21T09:00:00Z' }, NOW)).toBe(true)
		})

		it('does not apply once the date has passed, or without a readable date', () => {
			expect(indicatorApplies(held, { heldUntil: '2026-10-13' }, NOW)).toBe(false)
			expect(indicatorApplies(held, { heldUntil: '2026-10-20' }, NOW)).toBe(false)
			expect(indicatorApplies(held, { heldUntil: '' }, NOW)).toBe(false)
			expect(indicatorApplies(held, { heldUntil: 'soon' }, NOW)).toBe(false)
			expect(indicatorApplies(held, {}, NOW)).toBe(false)
		})

		it('takes an ISO date as the bound, and before as well as after', () => {
			const window = { field: 'due', after: '2026-10-01', before: '2026-11-01', text: 'This month' }
			expect(indicatorApplies(window, { due: '2026-10-15' }, NOW)).toBe(true)
			expect(indicatorApplies(window, { due: '2026-11-15' }, NOW)).toBe(false)
			expect(indicatorApplies({ field: 'due', before: 'now', text: 'Past' }, { due: '2026-10-01' }, NOW)).toBe(true)
		})

		it('refuses a bound that is not a date', () => {
			expect(indicatorApplies({ field: 'due', after: 'later', text: 'Later' }, { due: '2026-10-27' }, NOW)).toBe(false)
		})
	})
})

describe('indicatorText', () => {
	it('is empty for an entry with no text', () => {
		expect(indicatorText({ field: 'suspended' })).toBe('')
		expect(indicatorText({ field: 'suspended', text: '  ' })).toBe('')
		expect(indicatorText({ field: 'suspended', text: 'Suspended' })).toBe('Suspended')
	})
})

describe('resolveRowIndicators', () => {
	it('renders nothing when the page declares nothing', () => {
		expect(resolveRowIndicators([], { suspended: true })).toEqual({ shown: [], overflow: [] })
	})

	it('shows the declared indicators whose condition holds, in the declared order', () => {
		const { shown } = resolveRowIndicators(DECLARED, { suspended: true, decision: 'granted' })
		expect(shown.map((i) => i.id)).toEqual(['suspended', 'decided'])
	})

	it('a record cannot add an indicator the page has not declared', () => {
		// The record carries an "escalated" flag and a whole indicator block of
		// its own. Neither renders: the page's list is the membership list.
		const row = { suspended: true, escalated: true, indicators: [{ field: 'escalated', text: 'Escalated' }] }
		const { shown } = resolveRowIndicators(DECLARED, row)
		expect(shown.map((i) => i.id)).toEqual(['suspended'])
	})

	it('drops an indicator with no text alternative rather than drawing a bare icon', () => {
		const declared = [{ id: 'silent', field: 'suspended', icon: 'PauseCircleOutline' }, DECLARED[3]]
		const { shown } = resolveRowIndicators(declared, { suspended: true, decision: 'granted' })
		expect(shown.map((i) => i.id)).toEqual(['decided'])
	})

	it('moves everything past the cap into the overflow', () => {
		const row = { suspended: true, extended: true, parentCase: 'case-9', decision: 'granted' }
		const { shown, overflow } = resolveRowIndicators(DECLARED, row)
		expect(shown.map((i) => i.id)).toEqual(['suspended', 'extended', 'child'])
		expect(overflow.map((i) => i.id)).toEqual(['decided'])
	})

	it('honours a cap the page sets, including zero', () => {
		const row = { suspended: true, extended: true }
		expect(resolveRowIndicators(DECLARED, row, 1).shown.map((i) => i.id)).toEqual(['suspended'])
		expect(resolveRowIndicators(DECLARED, row, 0).shown).toEqual([])
		expect(resolveRowIndicators(DECLARED, row, 0).overflow.map((i) => i.id)).toEqual(['suspended', 'extended'])
	})
})

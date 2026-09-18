/**
 * Tests for availableRowActions (working-list-row-actions).
 *
 * A row's menu is the intersection of what the page declares and what the
 * server allows on that record for that caller. The server decides, with the
 * page, who is a member of the menu. The page alone decides how it reads.
 */

import {
	actionIdOf,
	availableRowActions,
	readRowAvailability,
	refusalReasonFor,
	undeclaredRowActions,
} from '../../src/utils/rowActionAvailability.js'

const DECLARED = [
	{ id: 'assign', label: 'Assign' },
	{ id: 'reject', label: 'Reject', destructive: true },
	{ id: 'close', label: 'Close' },
]

function rowWith(actions) {
	return { id: 'case-1', '@self': { actions } }
}

describe('actionIdOf', () => {
	it('prefers the id and falls back to the label', () => {
		expect(actionIdOf({ id: 'assign', label: 'Assign' })).toBe('assign')
		expect(actionIdOf({ label: 'Assign' })).toBe('Assign')
		expect(actionIdOf(null)).toBe('')
	})
})

describe('readRowAvailability', () => {
	it('reads a list of ids', () => {
		const { known, allowed } = readRowAvailability(rowWith(['assign', 'close']))
		expect(known).toBe(true)
		expect([...allowed].sort()).toEqual(['assign', 'close'])
	})

	it('reads a map of id to boolean', () => {
		const { known, allowed } = readRowAvailability(rowWith({ assign: true, reject: false }))
		expect(known).toBe(true)
		expect([...allowed]).toEqual(['assign'])
	})

	it('reads a map of id to allowed and reason, and keeps the reason', () => {
		const { allowed, reasons } = readRowAvailability(rowWith({
			assign: { allowed: true },
			reject: { allowed: false, reason: 'Advice has not been filed yet' },
		}))
		expect([...allowed]).toEqual(['assign'])
		expect(reasons.get('reject')).toBe('Advice has not been filed yet')
	})

	it('says it does not know when the row carries nothing there', () => {
		const { known, allowed } = readRowAvailability({ id: 'case-1' })
		expect(known).toBe(false)
		expect(allowed.size).toBe(0)
	})
})

describe('availableRowActions', () => {
	it('leaves the declaration standing when the server does not answer', () => {
		// Silence is a server that does not answer about actions, not a server
		// refusing everything. Reading it the other way empties every menu on
		// every list that has not adopted this yet.
		expect(availableRowActions(DECLARED, { id: 'case-1' })).toEqual(DECLARED)
	})

	it('offers only what the server allows, in the page order', () => {
		const out = availableRowActions(DECLARED, rowWith(['close', 'assign']))
		expect(out.map((a) => a.id)).toEqual(['assign', 'close'])
	})

	it('drops an action the server refuses and keeps its reason for a caller that asks', () => {
		const row = rowWith({ assign: true, close: true, reject: { allowed: false, reason: 'Advice has not been filed yet' } })
		const out = availableRowActions(DECLARED, row)
		expect(out.map((a) => a.id)).toEqual(['assign', 'close'])
		expect(refusalReasonFor(DECLARED[1], row)).toBe('Advice has not been filed yet')
	})

	it('a row cannot bring back an action the page declaration removed', () => {
		// The record still carries "reject" as allowed. The page stopped
		// declaring it, so it stays out: the server says who MAY run an
		// action, the page says which actions exist.
		const pageWithoutReject = [DECLARED[0], DECLARED[2]]
		const out = availableRowActions(pageWithoutReject, rowWith(['assign', 'reject', 'close']))
		expect(out.map((a) => a.id)).toEqual(['assign', 'close'])
	})

	it('keeps the page presentation of what is left', () => {
		const out = availableRowActions(DECLARED, rowWith(['reject']))
		expect(out[0]).toBe(DECLARED[1])
		expect(out[0].label).toBe('Reject')
		expect(out[0].destructive).toBe(true)
	})

	it('matches on the label when a page gave its actions no ids', () => {
		const declared = [{ label: 'Assign' }, { label: 'Reject' }]
		const out = availableRowActions(declared, rowWith(['Assign']))
		expect(out.map((a) => a.label)).toEqual(['Assign'])
	})

	it('reads any dotted path the page names', () => {
		const row = { id: 'case-1', permissions: { actions: ['close'] } }
		expect(availableRowActions(DECLARED, row, 'permissions.actions').map((a) => a.id)).toEqual(['close'])
	})

	it('empties the menu when the server allows nothing', () => {
		expect(availableRowActions(DECLARED, rowWith([]))).toEqual([])
	})
})

describe('undeclaredRowActions', () => {
	it('names what the server allowed that the page does not declare', () => {
		expect(undeclaredRowActions(DECLARED, rowWith(['assign', 'escalate', 'archive'])))
			.toEqual(['archive', 'escalate'])
	})

	it('says nothing when the server does not answer', () => {
		expect(undeclaredRowActions(DECLARED, { id: 'case-1' })).toEqual([])
	})
})

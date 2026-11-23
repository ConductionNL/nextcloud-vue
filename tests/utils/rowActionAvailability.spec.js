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

describe('built-in row actions', () => {
	const BUILTINS = [
		{ id: 'view', builtin: true, label: 'View' },
		{ id: 'edit', builtin: true, label: 'Edit' },
		{ id: 'copy', builtin: true, label: 'Copy' },
		{ id: 'delete', builtin: true, label: 'Delete' },
	]

	it('match the availability block by id', () => {
		expect(availableRowActions(BUILTINS, rowWith(['edit', 'delete'])).map((a) => a.id)).toEqual(['edit', 'delete'])
	})

	it('never match it by their label', () => {
		expect(availableRowActions(BUILTINS, rowWith(['Edit', 'Delete']))).toEqual([])
	})
})

describe('built-in row actions and OpenRegister permission verbs', () => {
	const BUILTINS = [
		{ id: 'view', builtin: true, label: 'View' },
		{ id: 'edit', builtin: true, label: 'Edit' },
		{ id: 'copy', builtin: true, label: 'Copy' },
		{ id: 'delete', builtin: true, label: 'Delete' },
	]
	const ids = (actions) => actions.map((a) => a.id)

	it('keeps all four built-ins for the block OpenRegister writes on show()', () => {
		const row = rowWith(['read', 'update', 'delete', 'destroy', 'export', 'assign'])
		expect(ids(availableRowActions(BUILTINS, row))).toEqual(['view', 'edit', 'copy', 'delete'])
	})

	it('lets read permit View and Copy, update Edit and delete Delete', () => {
		expect(ids(availableRowActions(BUILTINS, rowWith(['read'])))).toEqual(['view', 'copy'])
		expect(ids(availableRowActions(BUILTINS, rowWith(['update'])))).toEqual(['edit'])
		expect(ids(availableRowActions(BUILTINS, rowWith(['delete'])))).toEqual(['delete'])
	})

	it('reads the verbs from a map of booleans', () => {
		const row = rowWith({ read: true, update: false, delete: true })
		expect(ids(availableRowActions(BUILTINS, row))).toEqual(['view', 'copy', 'delete'])
	})

	it('reads the verbs from a map of allowed and reason', () => {
		const row = rowWith({ read: { allowed: true }, update: { allowed: false, reason: 'The case is closed' } })
		expect(ids(availableRowActions(BUILTINS, row))).toEqual(['view', 'copy'])
	})

	it('reads the verbs from a list of allowed and reason entries', () => {
		const row = rowWith([{ id: 'read' }, { id: 'update', allowed: false, reason: 'The case is closed' }])
		expect(ids(availableRowActions(BUILTINS, row))).toEqual(['view', 'copy'])
		expect(refusalReasonFor(BUILTINS[1], row)).toBe('The case is closed')
	})

	it('adds the verbs to the ids rather than replacing them', () => {
		expect(ids(availableRowActions(BUILTINS, rowWith(['view', 'update'])))).toEqual(['view', 'edit'])
		expect(ids(availableRowActions(BUILTINS, rowWith({ edit: false, update: true })))).toEqual(['edit'])
	})

	it('still hides a built-in the block names by neither its id nor its verb', () => {
		expect(ids(availableRowActions(BUILTINS, rowWith(['export', 'assign'])))).toEqual([])
	})

	it('leaves an app action that shares a built-in id to exact matching', () => {
		const app = [{ id: 'edit', label: 'Open editor' }, { id: 'view', label: 'Preview' }]
		expect(availableRowActions(app, rowWith(['read', 'update']))).toEqual([])
		expect(ids(availableRowActions(app, rowWith(['edit'])))).toEqual(['edit'])
	})

	it('hands a built-in the reason its verb was refused with', () => {
		const row = rowWith({ read: true, update: { allowed: false, reason: 'The case is closed' } })
		expect(refusalReasonFor(BUILTINS[1], row)).toBe('The case is closed')
		expect(refusalReasonFor(BUILTINS[0], row)).toBe('')
	})

	it('gives no reason for a built-in its own id allows, whatever its verb says', () => {
		const row = rowWith({ edit: true, update: { allowed: false, reason: 'The case is closed' } })
		expect(ids(availableRowActions(BUILTINS, row))).toEqual(['edit'])
		expect(refusalReasonFor(BUILTINS[1], row)).toBe('')
	})

	it('gives no reason for a built-in its verb allows, whatever its own id says', () => {
		const row = rowWith({ update: true, edit: { allowed: false, reason: 'Edit is off here' } })
		expect(ids(availableRowActions(BUILTINS, row))).toEqual(['edit'])
		expect(refusalReasonFor(BUILTINS[1], row)).toBe('')
	})

	it('prefers the reason on the built-in id over the one on its verb', () => {
		const row = rowWith({
			edit: { allowed: false, reason: 'Edit is off here' },
			update: { allowed: false, reason: 'The case is closed' },
		})
		expect(refusalReasonFor(BUILTINS[1], row)).toBe('Edit is off here')
	})

	it('does not lend a verb reason to an app action sharing a built-in id', () => {
		const row = rowWith({ update: { allowed: false, reason: 'The case is closed' } })
		expect(refusalReasonFor({ id: 'edit', label: 'Open editor' }, row)).toBe('')
	})

	it('does not report a verb a declared built-in consumes as undeclared', () => {
		const row = rowWith(['read', 'update', 'delete', 'destroy', 'export', 'assign'])
		expect(undeclaredRowActions(BUILTINS, row)).toEqual(['assign', 'destroy', 'export'])
		expect(undeclaredRowActions([BUILTINS[0]], row)).toEqual(['assign', 'delete', 'destroy', 'export', 'update'])
	})

	it('counts read as declared when Copy is the only built-in declared', () => {
		expect(undeclaredRowActions([BUILTINS[2]], rowWith(['read', 'update']))).toEqual(['update'])
	})

	it('keeps View when its id is allowed and read is refused', () => {
		const row = rowWith({ view: true, read: { allowed: false, reason: 'Hidden from you' } })
		expect(ids(availableRowActions(BUILTINS, row))).toEqual(['view'])
		expect(refusalReasonFor(BUILTINS[0], row)).toBe('')
	})

	it('reports a verb as undeclared when only an app action shares the built-in id', () => {
		expect(undeclaredRowActions([{ id: 'edit', label: 'Open editor' }], rowWith(['update']))).toEqual(['update'])
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

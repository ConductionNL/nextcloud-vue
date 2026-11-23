/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-board-reference-columns: the columns of a referenced field are the
 * referenced rows, ordered, narrowed to one parent and merged by name; a drop
 * resolves the row of the card's own parent.
 *
 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md
 */

import { buildBoardColumns } from '../../src/utils/boardColumns.js'
import {
	buildReferenceStages,
	buildValueStages,
	columnFieldsOf,
	columnKeyOfRow,
	fetchReferenceObjects,
	NO_VALUE_KEY,
	referenceTargetOf,
	refIdOf,
	resolveDropValue,
} from '../../src/utils/boardReferenceColumns.js'

// Two case types, each with its own statuses; "In behandeling" in both.
const STATUSES = [
	{ id: 's3', name: 'Besluit', order: 3, caseType: 'woo', colour: 'success' },
	{ id: 's1', name: 'Ontvangen', order: 1, caseType: 'woo', colour: 'primary' },
	{ id: 's2', name: 'In behandeling', order: 2, caseType: 'woo' },
	{ id: 'b1', name: 'Ontvangen', order: 1, caseType: 'bezwaar' },
	{ id: 'b2', name: 'In behandeling', order: 2, caseType: 'bezwaar' },
	{ id: 'b4', name: 'Hoorzitting', order: 4, caseType: 'bezwaar' },
]
const NARROW = { field: 'caseType', rowField: 'caseType' }

describe('refIdOf', () => {
	it('reads a string, an object id, a uuid and @self.id', () => {
		expect(refIdOf('a')).toBe('a')
		expect(refIdOf({ id: 7 })).toBe('7')
		expect(refIdOf({ uuid: 'u' })).toBe('u')
		expect(refIdOf({ '@self': { id: 's' } })).toBe('s')
		expect(refIdOf(null)).toBe('')
	})
})

describe('columnFieldsOf', () => {
	it('normalises entries and tells reference, values and schema fields apart', () => {
		const fields = columnFieldsOf({
			columnFields: ['priority', { field: 'status', source: { schema: 'statusType' } }, { field: 'assignee', kind: 'values', readOnly: true }, { label: 'no field' }],
		})
		expect(fields.map((f) => [f.field, f.kind, f.readOnly])).toEqual([
			['priority', 'schema', false],
			['status', 'reference', false],
			['assignee', 'values', true],
		])
		expect(columnFieldsOf({ statusField: 'status' })).toEqual([])
	})
})

describe('referenceTargetOf', () => {
	it('takes the source schema, else the property $ref as a slug, and the page register', () => {
		expect(referenceTargetOf({ schema: 'statusType' }, { register: 'dossiq' })).toEqual({ register: 'dossiq', schema: 'statusType' })
		expect(referenceTargetOf({}, { register: 'dossiq', property: { $ref: 'CaseType' } })).toEqual({ register: 'dossiq', schema: 'case-type' })
		expect(referenceTargetOf({ register: 'other' }, { register: 'dossiq' })).toEqual({ register: 'other', schema: '' })
	})
})

describe('buildReferenceStages', () => {
	it('orders by the order field and keeps one column per referenced row', () => {
		const { states } = buildReferenceStages({ refs: STATUSES.filter((s) => s.caseType === 'woo'), labelField: 'name', orderField: 'order', colorField: 'colour' })
		expect(states).toEqual([
			{ key: 's1', label: 'Ontvangen', color: 'primary' },
			{ key: 's2', label: 'In behandeling', color: '' },
			{ key: 's3', label: 'Besluit', color: 'success' },
		])
	})

	it('merges rows with the same name across parents, and maps every id to its column', () => {
		const { states, keyByValue, refsByKey } = buildReferenceStages({ refs: STATUSES, labelField: 'name', orderField: 'order', mergeBy: 'name' })
		expect(states.map((s) => s.key)).toEqual(['Ontvangen', 'In behandeling', 'Besluit', 'Hoorzitting'])
		expect(keyByValue.get('b2')).toBe('In behandeling')
		expect(keyByValue.get('s2')).toBe('In behandeling')
		expect(refsByKey.get('In behandeling').map(refIdOf)).toEqual(['s2', 'b2'])
	})

	it('narrows to one parent', () => {
		const { states } = buildReferenceStages({ refs: STATUSES, labelField: 'name', orderField: 'order', mergeBy: 'name', narrowBy: NARROW, narrowValue: 'bezwaar' })
		expect(states.map((s) => s.label)).toEqual(['Ontvangen', 'In behandeling', 'Hoorzitting'])
	})

	it('feeds buildBoardColumns: a card sits in its merged column, an empty stage stays a column', () => {
		const stages = buildReferenceStages({ refs: STATUSES, labelField: 'name', orderField: 'order', mergeBy: 'name' })
		const rows = [{ id: 1, status: 's2' }, { id: 2, status: { id: 'b2' } }, { id: 3, status: 'gone' }]
		const { columns } = buildBoardColumns({
			field: { states: stages.states },
			rows,
			statusField: 'status',
			keyOf: (row) => columnKeyOfRow(row, 'status', stages.keyByValue),
		})
		expect(columns.map((c) => [c.key, c.count])).toEqual([['Ontvangen', 0], ['In behandeling', 2], ['Besluit', 0], ['Hoorzitting', 0], ['__off_board__', 1]])
	})
})

describe('buildValueStages', () => {
	it('takes the values present, by label, then a column for no value', () => {
		const { states, keyByValue } = buildValueStages({
			rows: [{ a: 'pieter' }, { a: 'anouk' }, { a: 'pieter' }, { a: '' }],
			field: 'a',
			valueLabels: { pieter: 'Pieter Jansen' },
			emptyLabel: 'Niemand',
		})
		expect(states).toEqual([
			{ key: 'anouk', label: 'anouk', color: '' },
			{ key: 'pieter', label: 'Pieter Jansen', color: '' },
			{ key: NO_VALUE_KEY, label: 'Niemand', color: '' },
		])
		expect(columnKeyOfRow({ a: '' }, 'a', keyByValue)).toBe(NO_VALUE_KEY)
	})
})

describe('resolveDropValue', () => {
	const { refsByKey } = buildReferenceStages({ refs: STATUSES, labelField: 'name', mergeBy: 'name' })

	it('writes the merged column row of the card\'s own parent', () => {
		expect(resolveDropValue({ card: { caseType: 'bezwaar' }, toKey: 'In behandeling', kind: 'reference', refsByKey, narrowBy: NARROW }).value).toBe('b2')
		expect(resolveDropValue({ card: { caseType: { id: 'woo' } }, toKey: 'In behandeling', kind: 'reference', refsByKey, narrowBy: NARROW }).value).toBe('s2')
	})

	it('refuses a column the card\'s parent has no row for', () => {
		expect(resolveDropValue({ card: { caseType: 'woo' }, toKey: 'Hoorzitting', kind: 'reference', refsByKey, narrowBy: NARROW })).toBeNull()
		expect(resolveDropValue({ card: {}, toKey: 'Nope', kind: 'reference', refsByKey })).toBeNull()
	})

	it('writes the value itself for a values field, and null for no value', () => {
		expect(resolveDropValue({ card: {}, toKey: 'pieter', kind: 'values' })).toEqual({ value: 'pieter', target: null })
		expect(resolveDropValue({ card: {}, toKey: NO_VALUE_KEY, kind: 'values' })).toEqual({ value: null, target: null })
	})
})

describe('fetchReferenceObjects', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('asks the list endpoint once with the filters, and reads results', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{ id: 'x' }] }) })
		const rows = await fetchReferenceObjects({ register: 'dossiq', schema: 'statusType', filter: { isFinal: false } })
		expect(rows).toEqual([{ id: 'x' }])
		const url = decodeURIComponent(global.fetch.mock.calls[0][0])
		expect(url).toContain('/apps/openregister/api/objects/dossiq/statusType?')
		expect(url).toContain('isFinal=false')
		expect(url).toContain('_limit=500')
	})

	it('asks nothing without a register or schema', async () => {
		global.fetch = jest.fn()
		expect(await fetchReferenceObjects({ register: 'dossiq', schema: '' })).toEqual([])
		expect(global.fetch).not.toHaveBeenCalled()
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page can mark rows from its manifest (`config.rowClass` rules), as
 * the object-table widget already could: DqTaken marks a task whose `dueAt`
 * lies before today. The rules compile once, shared by both, and a date
 * compares with `@today` as a moment.
 */
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { compileRowClass } from '../../src/utils/rowClassRules.js'
import { compareVisibleWhen } from '../../src/utils/visibleWhen.js'

const today = new Date().toISOString().slice(0, 10)
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10)

describe('row class rules', () => {
	const rules = [
		{ when: { field: 'dueAt', op: 'lt', value: '@today' }, class: 'cn-row--overdue' },
		{ when: { field: 'state', value: 'blocked' }, class: 'cn-row--blocked' },
	]

	it('marks an overdue row, and every rule that holds', () => {
		const rowClass = compileRowClass(rules)
		expect(rowClass({ dueAt: yesterday, state: 'open' })).toBe('cn-row--overdue')
		expect(rowClass({ dueAt: `${yesterday}T09:00:00Z`, state: 'blocked' })).toBe('cn-row--overdue cn-row--blocked')
		expect(rowClass({ dueAt: tomorrow, state: 'open' })).toBe('')
		expect(rowClass({ state: 'open' })).toBe('')
	})

	it('passes a function through and ignores anything else', () => {
		const fn = () => 'x'
		expect(compileRowClass(fn)).toBe(fn)
		expect(compileRowClass([])).toBeNull()
		expect(compileRowClass(null)).toBeNull()
		expect(compileRowClass([{ when: { field: 'a' } }])({ a: 1 })).toBe('')
	})

	it('compares two dates as moments, and still numbers as numbers', () => {
		expect(compareVisibleWhen(yesterday, 'lt', today)).toBe(true)
		expect(compareVisibleWhen(tomorrow, 'gt', '@today')).toBe(true)
		expect(compareVisibleWhen('12', 'lt', '3')).toBe(false)
		expect(compareVisibleWhen('not a date', 'lt', today)).toBe(false)
	})

	it('is what CnIndexPage hands its table', () => {
		const fn = CnIndexPage.computed.compiledRowClass.call({ rowClass: rules })
		expect(fn({ dueAt: yesterday })).toBe('cn-row--overdue')
		expect(CnIndexPage.props.rowClass.type).toEqual([Function, Array])
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/screens-record-list-avatar/specs/record-list-avatar/spec.md#requirement-a-record-list-row-can-carry-an-avatar
 */
import { initialsOf } from '@/utils/initials.js'

describe('initialsOf', () => {
	it('is the first letters of the first and last word, upper-cased', () => {
		expect(initialsOf('Sanne de Vries')).toBe('SV')
		expect(initialsOf('  café   de kroon ')).toBe('CK')
		expect(initialsOf('Jan')).toBe('J')
		expect(initialsOf('émile zola')).toBe('ÉZ')
	})

	it('is empty for no name', () => {
		expect(initialsOf('')).toBe('')
		expect(initialsOf('   ')).toBe('')
		expect(initialsOf(null)).toBe('')
		expect(initialsOf(42)).toBe('')
	})
})

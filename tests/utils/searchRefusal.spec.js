/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * readSearchRefusal and the position parseResponseError now carries.
 *
 * @spec openspec/changes/index-search-refusal/specs/index-search-refusal/spec.md#requirement-a-refused-search-is-said-where-it-was-typed
 */
import { parseResponseError } from '../../src/utils/errors.js'
import { readSearchRefusal } from '../../src/utils/searchRefusal.js'

describe('readSearchRefusal', () => {
	it('splits the term around the character it points at', () => {
		expect(readSearchRefusal({ status: 400, message: 'Unclosed quote at position 5.', position: 5 }, 'ab c"d')).toEqual({
			message: 'Unclosed quote at position 5.',
			position: 5,
			term: 'ab c"d',
			before: 'ab c',
			at: '"',
			after: 'd',
		})
	})

	it('falls back to the message, and clamps a position past the end', () => {
		expect(readSearchRefusal({ status: 400, message: 'Unexpected end at position 9.' }, 'a OR')).toMatchObject({ position: 9, before: 'a OR', at: '', after: '' })
	})

	it('is null for anything that is not a refused search', () => {
		expect(readSearchRefusal({ status: 500, message: 'x at position 1.' }, 'a')).toBeNull()
		expect(readSearchRefusal({ status: 400, message: 'Invalid search query' }, 'a')).toBeNull()
		expect(readSearchRefusal({ status: 400, message: 'x at position 1.' }, '  ')).toBeNull()
		expect(readSearchRefusal(null, 'a')).toBeNull()
	})
})

describe('parseResponseError', () => {
	it('keeps the position a 400 body carries', async () => {
		const response = { status: 400, json: async () => ({ error: 'Unclosed bracket at position 9.', position: 9, term: 'verzoek (2026' }) }
		const error = await parseResponseError(response, 'case')
		expect(error.position).toBe(9)
		expect(error.message).toBe('Unclosed bracket at position 9.')
	})
})

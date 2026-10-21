/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * fillItemTokens: whole tokens keep their value and type, embedded ones are
 * text, URL-encoded in url / target / href.
 *
 * @spec openspec/changes/week-view/specs/week-view/spec.md#requirement-a-week-view-reads-its-week-from-an-endpoint-and-moves-through-weeks
 */
import { fillItemTokens } from '../../src/utils/itemTokens.js'

const item = { id: 'a b', free: 2, joinUrl: 'https://x/y', room: { name: 'B12' } }

describe('fillItemTokens', () => {
	it('fills whole and embedded tokens', () => {
		expect(fillItemTokens({
			url: '/api/lessons/@item.id/notes',
			href: '@item.joinUrl',
			label: 'Room @item.room.name',
			payload: { free: '@item.free', lesson: '@item', missing: '@item.none' },
			list: ['@item.id'],
		}, { item })).toEqual({
			url: '/api/lessons/a%20b/notes',
			href: 'https://x/y',
			label: 'Room B12',
			payload: { free: 2, lesson: item, missing: null },
			list: ['a b'],
		})
	})

	it('leaves other roots and non-strings alone', () => {
		expect(fillItemTokens({ a: '@group.id', b: 3 }, { item })).toEqual({ a: '@group.id', b: 3 })
		expect(fillItemTokens('x', {})).toBe('x')
	})
})

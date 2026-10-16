/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * board-neutral-column-colour: with `source.neutralColor`, a column merged
 * from several referenced rows takes the first colour somebody chose, and the
 * neutral colour only when every row holds it. Unset, the first row decides.
 *
 * @spec openspec/changes/board-neutral-column-colour/specs/board-view/spec.md
 */

import { buildReferenceStages, mergedColumnColor } from '../../src/utils/boardReferenceColumns.js'

const STATUSES = [
	{ id: 'w1', name: 'Ontvangen', order: 1, caseType: 'woo', colour: 'grey' },
	{ id: 'w2', name: 'In behandeling', order: 2, caseType: 'woo', colour: 'grey' },
	{ id: 'b2', name: 'In behandeling', order: 2, caseType: 'bez', colour: 'orange' },
	{ id: 'b1', name: 'Ontvangen', order: 1, caseType: 'bez', colour: 'grey' },
	{ id: 'w3', name: 'Besluit', order: 3, caseType: 'woo', colour: 'green' },
	{ id: 'b3', name: 'Besluit', order: 3, caseType: 'bez', colour: 'red' },
	{ id: 'b4', name: 'Hoorzitting', order: 4, caseType: 'bez', colour: 'grey' },
]

/**
 * @param {object} options Extra buildReferenceStages options.
 * @return {Array<Array<string>>} Each column's key and colour.
 */
function colours(options) {
	return buildReferenceStages({ refs: STATUSES, orderField: 'order', colorField: 'colour', mergeBy: 'name', ...options })
		.states.map((state) => [state.key, state.color])
}

describe('buildReferenceStages with neutralColor', () => {
	it('draws a merged column in the chosen colour when a neutral row comes first', () => {
		expect(colours({ neutralColor: 'grey' })).toEqual([
			['Ontvangen', 'grey'],
			['In behandeling', 'orange'],
			['Besluit', 'green'],
			['Hoorzitting', 'grey'],
		])
	})

	it('keeps the first row colour without neutralColor', () => {
		expect(colours({})).toEqual([
			['Ontvangen', 'grey'],
			['In behandeling', 'grey'],
			['Besluit', 'green'],
			['Hoorzitting', 'grey'],
		])
	})

	it('reads the row `color` when no colorField is set', () => {
		const refs = [
			{ id: 'a', name: 'Open', color: 'grey' },
			{ id: 'b', name: 'Open', color: 'warning' },
		]
		expect(buildReferenceStages({ refs, mergeBy: 'name', neutralColor: 'grey' }).states[0].color).toBe('warning')
	})
})

describe('mergedColumnColor', () => {
	it('takes the first chosen colour in either position and skips rows without one', () => {
		expect(mergedColumnColor(['grey', '', 'orange', 'blue'], 'grey')).toBe('orange')
		expect(mergedColumnColor(['orange', 'grey'], 'grey')).toBe('orange')
		expect(mergedColumnColor(['', 'grey'], 'grey')).toBe('grey')
	})

	it('falls back when no row has a colour', () => {
		expect(mergedColumnColor(['', ''], 'grey', '')).toBe('')
	})

	it('compares colours as written, as dossiq does', () => {
		expect(mergedColumnColor(['grey', 'Grey'], 'grey')).toBe('Grey')
		expect(mergedColumnColor(['grey', '#696969'], 'grey')).toBe('#696969')
	})
})

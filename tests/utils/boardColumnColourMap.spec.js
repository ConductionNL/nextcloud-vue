/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * board-column-colour-map: with `source.colorMap`, a column built from
 * referenced rows is drawn in the CSS colour its stored colour maps to,
 * applied after the merge. A colour the map leaves out is kept as stored.
 *
 * @spec openspec/changes/board-column-colour-map/specs/board-view/spec.md
 */

import { resolveStageColor } from '../../src/utils/boardColumns.js'
import { buildReferenceStages, mappedColor } from '../../src/utils/boardReferenceColumns.js'

const MAP = {
	orange: 'var(--nl-color-orange, #e17000)',
	grey: 'var(--nl-color-grey, #696969)',
	'grey-light': 'var(--nl-color-grey-light, #f0f0f0)',
}

const STATUSES = [
	{ id: 'w1', name: 'Ontvangen', order: 1, caseType: 'woo', colour: 'grey-light' },
	{ id: 'w2', name: 'In behandeling', order: 2, caseType: 'woo', colour: 'grey' },
	{ id: 'b2', name: 'In behandeling', order: 2, caseType: 'bez', colour: 'orange' },
	{ id: 'b3', name: 'Besluit', order: 3, caseType: 'bez', colour: 'green' },
]

/**
 * @param {object} options Extra buildReferenceStages options.
 * @return {Array<Array<string>>} Each column's key and colour.
 */
function colours(options) {
	return buildReferenceStages({ refs: STATUSES, orderField: 'order', colorField: 'colour', mergeBy: 'name', ...options })
		.states.map((state) => [state.key, state.color])
}

describe('buildReferenceStages with colorMap', () => {
	it('draws each column in its mapped colour, after neutralColor picked the stored one', () => {
		expect(colours({ neutralColor: 'grey', colorMap: MAP })).toEqual([
			['Ontvangen', 'var(--nl-color-grey-light, #f0f0f0)'],
			['In behandeling', 'var(--nl-color-orange, #e17000)'],
			['Besluit', 'green'],
		])
	})

	it('keeps the stored colours without a map', () => {
		expect(colours({ neutralColor: 'grey' })).toEqual([
			['Ontvangen', 'grey-light'],
			['In behandeling', 'orange'],
			['Besluit', 'green'],
		])
	})

	it('hands the dot a mapped value as it is', () => {
		const [state] = colours({ colorMap: MAP })
		expect(resolveStageColor(state[1])).toBe('var(--nl-color-grey-light, #f0f0f0)')
	})
})

describe('mappedColor', () => {
	it('maps a listed colour and keeps any other', () => {
		expect(mappedColor('orange', MAP)).toBe('var(--nl-color-orange, #e17000)')
		expect(mappedColor('purple', MAP)).toBe('purple')
		expect(mappedColor('', MAP)).toBe('')
		expect(mappedColor('orange', null)).toBe('orange')
	})

	it('ignores an empty or non-string mapping and inherited keys', () => {
		expect(mappedColor('orange', { orange: '' })).toBe('orange')
		expect(mappedColor('orange', { orange: 3 })).toBe('orange')
		expect(mappedColor('constructor', {})).toBe('constructor')
	})
})

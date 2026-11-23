/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Rows side by side are as high as the tallest (DqZaakSamenwerken r32:
 * "Delen" 60 high beside "Overdragen" 76).
 *
 * @spec openspec/changes/choice-rows-side-by-side-equal-height/specs/choice-cards/spec.md
 */
import fs from 'fs'
import path from 'path'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnChoiceCards/CnChoiceCards.vue'), 'utf8')

function rule(selector) {
	const at = sfc.indexOf('\n' + selector + ' {')
	return at < 0 ? '' : sfc.slice(at, sfc.indexOf('}', at))
}

describe('CnChoiceCards rows side by side', () => {
	it('lets a row fill its cell', () => {
		expect(rule('.cn-choice-cards__cell:not(.cn-choice-cards__cell--with-details) > .cn-choice-cards__row')).toContain('flex-grow: 1')
	})

	it('keeps the cell a column, so the row grows in height', () => {
		expect(rule('.cn-choice-cards__cell')).toContain('flex-direction: column')
	})
})

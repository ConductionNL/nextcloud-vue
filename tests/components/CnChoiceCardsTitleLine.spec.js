/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An option's title sits on an 18px line (15px at 1.2), as the boards draw
 * it (DqBesluit r25f: "Deels openbaar gemaakt" 22.5 vs 18).
 */
import fs from 'fs'
import path from 'path'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnChoiceCards/CnChoiceCards.vue'), 'utf8')

describe('CnChoiceCards option title', () => {
	it('sets the title 15px/600 on a 1.2 line', () => {
		const at = sfc.indexOf('\n.cn-choice-cards__row-title {')
		const body = sfc.slice(at, sfc.indexOf('}', at))
		expect(body).toContain('font-size: 15px')
		expect(body).toContain('line-height: 1.2')
	})
})

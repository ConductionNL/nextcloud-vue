/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { evalFormula } from '../../src/utils/evalFormula.js'

describe('evalFormula', () => {
	it('evaluates a ratio formula', () => {
		expect(evalFormula('A/B*100', { A: 17, B: 58 })).toBeCloseTo(29.31, 1)
	})
	it('respects operator precedence + parentheses', () => {
		expect(evalFormula('(A-B)/B', { A: 120, B: 100 })).toBeCloseTo(0.2, 5)
		expect(evalFormula('A+B*C', { A: 1, B: 2, C: 3 })).toBe(7)
	})
	it('handles unary minus', () => {
		expect(evalFormula('-A+B', { A: 5, B: 8 })).toBe(3)
	})
	it('returns null on divide-by-zero', () => {
		expect(evalFormula('A/B', { A: 5, B: 0 })).toBeNull()
	})
	it('returns null on unknown identifier or bad formula', () => {
		expect(evalFormula('A/Z', { A: 5 })).toBeNull()
		expect(evalFormula('A +* B', { A: 1, B: 2 })).toBeNull()
		expect(evalFormula('', {})).toBeNull()
	})
})

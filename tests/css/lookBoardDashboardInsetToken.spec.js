/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every board dashboard card body takes the one card inset token, so the
 * boards' 22px (51 of the Dq boards, "padding: 20px 22px") reaches the
 * record lists, card grids and saved views too. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-card-inset-22/specs/board-dashboard-card-inset-22/spec.md#requirement-a-board-dashboard-card-is-inset-22px
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: dashboard card bodies use the inset token', () => {
	it('writes no hard 24px side inset in a dashboard rule', () => {
		const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].includes('.cn-dashboard-page'))
		const hard = rules.filter((m) => /padding:\s*[\d.]+px\s+24px\b/.test(m[2])).map((m) => m[1].trim())
		expect(hard).toEqual([])
	})
})

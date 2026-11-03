/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board table row marked for attention is tinted warm: a fifth of the
 * warning pill's light ground (PtToegangsverzoeken, PtUitnodigingen #fffdf7). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-attention-row/specs/board-attention-row/spec.md#requirement-a-board-table-row-marked-for-attention-is-tinted-warm
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: attention rows', () => {
	it('tints the cells of a row marked cn-row--attention', () => {
		const at = css.indexOf('.cn-look-board .cn-data-table tr.cn-row--attention > td:not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toMatch(/background: color-mix\(in srgb, var\(--nl-color-orange-light, var\(--color-warning-light, rgba\(232, 163, 39, 0\.15\)\)\) 22%, var\(--color-main-background\)\);/)
	})
})

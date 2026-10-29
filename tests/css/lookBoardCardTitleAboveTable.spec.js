/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Over a table a board dashboard card's title stands the full 12px above it:
 * the header's 0.15em leading allowance is for a first text line, and a
 * table's head row has a box of its own (r34 DqDoorlooptijd "Wettelijke
 * Woo-termijnen", "Zaken met risico", "Prestaties per zaaktype" gapBelowTitle
 * 19.8 vs 22; probed: header padding-bottom 9.75px). Read from the stylesheet.
 *
 * @spec openspec/changes/board-card-title-above-table/specs/board-card-title-above-table/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board: a card title over a table', () => {
	it('stands 12px above an object table, without the text leading allowance', () => {
		const re = /([^{}]+)\{([^{}]*)\}/g
		let found = null
		let m
		while ((m = re.exec(css))) {
			if (m[1].includes('> .cn-widget-wrapper__content > .cn-widget-object-table__host') && m[1].includes('.cn-widget-wrapper__header') && /padding-bottom:\s*12px/.test(m[2])) {
				found = m[1]
			}
		}
		expect(found).not.toBeNull()
		expect(found).toContain(':not(.cn-widget-wrapper--borderless)')
	})
})

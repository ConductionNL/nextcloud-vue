/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A long case type pill ("Kenteken wijzigen parkeervergunning") ran over the
 * deadline cell beside it in the team queue on :8080. In the board look a pill
 * in a trailing cell keeps to the cell's width and ends in an ellipsis. jsdom
 * draws no layout, so the rules are read as text.
 *
 * @spec openspec/changes/board-list-trail-pill-ellipsis/specs/board-list-trail-pill-ellipsis/spec.md#requirement-a-pill-in-a-list-rows-trailing-cell-stays-inside-the-cell
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('a pill in a list row\'s trailing cell', () => {
	it('keeps to the cell and ends in an ellipsis', () => {
		const pill = css.match(/\.cn-look-board \.cn-object-row__trail \.cn-status-badge:not\(\.cn-look-nextcloud \*\) \{([^}]*)\}/)
		expect(pill).not.toBeNull()
		expect(pill[1]).toContain('max-width: 100%;')
		expect(pill[1]).toContain('overflow: hidden;')
		expect(pill[1]).toContain('text-overflow: ellipsis;')
		expect(pill[1]).toContain('display: inline-block;')
	})

	it('lets the cell renderer take the cell\'s width', () => {
		const cell = css.match(/\.cn-look-board \.cn-object-row__trail \.cn-cell-renderer:not\(\.cn-look-nextcloud \*\) \{([^}]*)\}/)
		expect(cell).not.toBeNull()
		expect(cell[1]).toContain('max-width: 100%;')
	})
})

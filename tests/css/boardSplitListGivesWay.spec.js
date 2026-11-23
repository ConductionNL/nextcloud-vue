/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a table list is a card with `flex: 1 1 auto` and a fixed
 * table at 100% width, so its flex basis is the whole body. Opened beside it,
 * the split pane (board PqKassaAudit) shrank to 13px. A split list starts from
 * zero and takes what the pane leaves; the pane keeps its declared width.
 *
 * @spec openspec/changes/board-split-list-gives-way/specs/board-split-list-gives-way/spec.md#requirement-the-split-pane-keeps-its-width-beside-a-board-table
 */
const fs = require('fs')
const path = require('path')

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const board = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8'))
const base = strip(fs.readFileSync(path.join(__dirname, '../../src/css/index-page.css'), 'utf8'))

describe('board split view beside a table list', () => {
	it('lets the split list card start from zero width', () => {
		expect(board).toMatch(/\.cn-look-board \.cn-index-page__main\.cn-index-page__main--split\s*\{[^}]*flex: 1 1 0;/)
	})

	it('keeps the split pane at its declared width', () => {
		expect(base).toMatch(/\.cn-index-page__split-pane:not\(\.cn-index-page__split-pane--full\)\s*\{[^}]*flex-shrink: 0;/)
	})

	it('leaves the full-width detail layout alone', () => {
		expect(base).toMatch(/\.cn-index-page__split-pane--full\s*\{[^}]*flex: 1;/)
	})
})

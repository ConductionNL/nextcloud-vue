/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A table on a board settings card draws its head 42.5px (DqInstellingen,
 * DqVthInstellingen), whatever its head cells hold. jsdom draws no layout, so
 * the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-settings-table-head-height/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: a settings table head', () => {
	it('is 42.5px', () => {
		expect(css).toMatch(/\.cn-look-board \.settings-section \.cn-table-container--board \.cn-data-table thead th:not\(\.cn-look-nextcloud \*\) \{\s*height: 42\.5px;\s*box-sizing: border-box;\s*\}/)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look an empty state on a settings card is the board's 104px.
 * Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-settings-empty-state/specs/board-settings-empty-state/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const body = (sel) => css.slice(css.indexOf(`${sel} {`), css.indexOf('}', css.indexOf(`${sel} {`)))
const S = '.cn-look-board .settings-section:not(.cn-look-nextcloud *) .empty-content'

describe('look-board.css: a settings empty state', () => {
	it('draws a 48px icon over a 24px line, 8px apart, 12px in', () => {
		expect(body(S)).toContain('padding: 12px 0;')
		expect(body(S)).toContain('gap: 8px;')
		expect(body(`${S}__icon svg`)).toContain('width: 48px !important;')
		expect(body(`${S}__name`)).toContain('line-height: 24px;')
	})
})

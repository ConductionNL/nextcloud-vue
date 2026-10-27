/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a settings card's text area sets its lines at 1.5, 8px
 * 12px in. Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-settings-textarea-leading/specs/board-settings-textarea-leading/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: settings text area', () => {
	it('sets 15px lines at 1.5 with 8px 12px padding', () => {
		const sel = '.cn-look-board .settings-section:not(.cn-look-nextcloud *) .textarea__input {'
		const at = css.indexOf(sel)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('line-height: 1.5;')
		expect(body).toContain('padding: 8px 12px;')
		expect(body).toContain('font-size: 15px;')
	})
})

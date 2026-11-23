/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a settings card's text area is a block, so its wrapper
 * ends at the area and the hint sits under it as drawn. Read as text: jsdom
 * draws no layout.
 *
 * @spec openspec/changes/board-settings-textarea-leading/specs/board-settings-textarea-leading/spec.md#requirement-a-board-settings-text-area-leaves-no-line-gap-under-it
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: settings text area as a block', () => {
	it('draws the text area as a block, not inline', () => {
		const sel = '.cn-look-board .settings-section:not(.cn-look-nextcloud *) .textarea__input {'
		const at = css.indexOf(sel)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('display: block;')
	})
})

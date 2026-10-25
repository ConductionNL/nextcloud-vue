/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board card's title-row buttons stand 8px apart (DqZaakContact "Live
 * gesprek"). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-card-header-actions-gap/specs/board-card-header-actions-gap/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: card header actions', () => {
	it('stand 8px apart in the board look only', () => {
		const selector = '.cn-look-board .cn-widget-wrapper__actions:not(.cn-look-nextcloud *) {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toMatch(/gap:\s*8px/)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list's tonal pill keeps the primary tint in the board look
 * (DqZaakGerelateerd "Vervolg plannen"; r31 drew it grey in the body ink).
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-record-list-tonal-pill/specs/record-list/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: the record list tonal pill', () => {
	it('reads the primary tint on the list and paints the pill with it', () => {
		expect(rule('.cn-look-board .cn-record-list:not(.cn-look-nextcloud *)')).toContain('--cn-record-list-tonal-bg: var(--color-primary-element-light)')
		expect(rule('.cn-look-board .cn-record-list .cn-record-list__action--tonal.button-vue:not(.cn-look-nextcloud *)')).toContain('background-color: var(--cn-record-list-tonal-bg)')
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * On a detail page marked `cardButtons: "regular"` a labelled card header
 * button takes the 40px control height in the board look. Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/detail-card-buttons-regular/specs/detail-card-buttons/spec.md#requirement-a-detail-page-can-draw-its-card-header-buttons-at-the-control-height
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: regular card header buttons', () => {
	it('draws a labelled card header button at the control height on a marked page', () => {
		const sel = '.cn-look-board.cn-detail-page--card-buttons-regular .cn-widget-wrapper__actions .button-vue:not(.action-item__menutoggle):has(> .button-vue__wrapper > .button-vue__text:not(:empty)):where(:not(.cn-look-nextcloud *))'
		const at = css.indexOf(sel)
		expect(at).toBeGreaterThan(-1)
		const open = css.indexOf('{', at)
		expect(css.slice(open, css.indexOf('}', open))).toContain('--button-size: var(--cn-board-control-height);')
	})
})

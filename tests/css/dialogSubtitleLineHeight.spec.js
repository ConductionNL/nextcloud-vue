/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dialog's subtitle sets its 14px lines at 1.5, as the boards draw it
 * (DqBesluit: a two-line subtitle, 68px from the title to the first field,
 * live 64). The theme's paragraph token gets the same line height.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('dialog.css: the subtitle', () => {
	it('sets its lines at 1.5, also through the theme\'s paragraph token', () => {
		const at = css.indexOf('.cn-dialog-header__subtitle {')
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('line-height: 1.5;')
		expect(body).toContain('--nldesign-component-paragraph-line-height: 1.5;')
	})
})

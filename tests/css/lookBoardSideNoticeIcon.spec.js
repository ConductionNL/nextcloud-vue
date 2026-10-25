/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The side notice's icon sits on the first line of its text (DqZaak
 * "Advies gevraagd"), not centred on a three-line notice: the icon's own
 * `align-self: center` (vue-material-design-icons) is overruled. Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-side-notice-icon-first-line/specs/board-side-notice-icon-first-line/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: the side notice icon', () => {
	it('sits on the first line', () => {
		const body = rule('.cn-look-board .cn-detail-page__side-item--notice .cn-banner-widget__card .notecard__icon:not(.cn-look-nextcloud *)')
		expect(body).toMatch(/align-self:\s*flex-start/)
		expect(body).toMatch(/margin-top:\s*2px/)
	})
})

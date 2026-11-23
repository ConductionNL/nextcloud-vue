/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts card's link with an icon sets the icon beside its text in the
 * board look (Werkinstructie on the Dq case boards; r31 drew the icon above
 * the text). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-facts-link-icon-beside-text/specs/facts-widget/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: a facts link with an icon', () => {
	it('sets the icon beside the text, 10px apart, on the normal line', () => {
		const body = rule('.cn-look-board .cn-facts-widget .cn-facts-widget__link:has(> .material-design-icon):not(.cn-look-nextcloud *)')
		expect(body).toContain('display: flex')
		expect(body).toContain('align-items: center')
		expect(body).toContain('gap: 10px')
		expect(body).toContain('line-height: normal')
		expect(body).toContain('margin-top: var(--cn-board-first-line-leading)')
	})
})

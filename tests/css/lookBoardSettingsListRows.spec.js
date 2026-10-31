/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a list an app draws itself on a settings card
 * (`cn-settings-list` with `cn-settings-row` rows) draws flat rows divided by
 * a hairline, flush with the card's title (PqBeheer Vaardigheden,
 * Medewerkerprofielen, Productcategorieën). Read as text: jsdom draws no
 * layout.
 *
 * @spec openspec/changes/board-settings-list-rows/specs/board-settings-list-rows/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the first rule whose selector list holds `sel`.
 *
 * @param {string} sel A selector.
 * @return {string} The rule body, or '' when there is none.
 */
function ruleFor(sel) {
	const at = css.indexOf(sel)
	if (at === -1) {
		return ''
	}
	const open = css.indexOf('{', at)
	return css.slice(open, css.indexOf('}', open))
}

const scope = '.cn-look-board .settings-section:not(.cn-look-nextcloud *)'

describe('look-board.css: list rows an app draws on a settings card', () => {
	it('stacks the rows without a gap', () => {
		expect(ruleFor(`${scope} .cn-settings-list.cn-settings-list`)).toMatch(/gap: 0/)
	})

	it('draws a row flat, flush left with the title, with a hairline below', () => {
		const body = ruleFor(`${scope} .cn-settings-row.cn-settings-row`)
		expect(body).toContain('padding: 10px 0')
		expect(body).toContain('border: 0')
		expect(body).toContain('border-bottom: 1px solid var(--cn-board-hairline)')
		expect(body).toContain('border-radius: 0')
		expect(body).toContain('background: transparent')
	})

	it('leaves the Nextcloud look alone', () => {
		expect(css).not.toMatch(/(^|[},\s])\.cn-settings-row\s*\{/)
	})
})

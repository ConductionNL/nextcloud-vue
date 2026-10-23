/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board table's selection and row-menu columns keep their measured width
 * under Nextcloud's `#content[class*="app-"] * { box-sizing: border-box }`. That
 * id selector outranks any class rule, so a `content-box` declared here was
 * ignored: the selection column was 28px including its 16px padding (the
 * header checkbox showed as a bracket) and the 34px row menu button sat in a
 * 34px cell and ran past the card. The rules now force `border-box` with
 * `!important` and size the columns to content plus padding. jsdom draws no
 * layout, so the values are read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Concatenated rule bodies whose selector list has a selector ending in `needle`. */
function rulesEndingWith(needle) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).some((s) => s.endsWith(needle))) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const px = (body, prop) => Number((body.match(new RegExp(`(?:^|[\\s;])${prop}:\\s*(\\d+)px`)) || [])[1])

/** Padding on both inline sides, from the `padding-inline` shorthand (one or two values). */
function inlinePadding(body) {
	const m = body.match(/padding-inline:\s*(\d+)(?:px)?(?:\s+(\d+)(?:px)?)?/)
	const start = Number(m[1])
	return start + (m[2] === undefined ? start : Number(m[2]))
}

describe('look-board-index.css: table control columns under the Nextcloud box model', () => {
	it('forces border-box on the selection column and sizes it to 28px of content plus 16px of padding', () => {
		const body = rulesEndingWith('.cn-table-container--board .cn-data-table .cn-table-col--checkbox')
		expect(body).toMatch(/box-sizing:\s*border-box !important/)
		expect(px(body, 'width')).toBe(28 + inlinePadding(body))
		expect(px(body, 'min-width')).toBe(px(body, 'width'))
	})

	it('forces border-box on the row menu column and sizes it to the 34px button plus 16px either side', () => {
		const body = rulesEndingWith('.cn-table-container--board .cn-data-table .cn-table-col--actions')
		expect(body).toMatch(/box-sizing:\s*border-box !important/)
		expect(px(body, 'width')).toBe(34 + inlinePadding(body))
		expect(px(body, 'min-width')).toBe(px(body, 'width'))
	})
})

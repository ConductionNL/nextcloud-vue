/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list page's breadcrumb trail under the title (CnHeaderTrail) reads 14px,
 * as 12 of the 14 list boards with a trail draw it (DqZaaktypen,
 * DqContracten, DqInstellingen, ...): the board crumb rule's 14px, with no
 * index-page rule enlarging the trail or its crumbs. jsdom draws no layout,
 * so the rules are read as text.
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Every rule whose selector list mentions the needle, as [selector, body].
 *
 * @param {string} css The stylesheet.
 * @param {string} needle Text the selector contains.
 * @return {Array<Array<string>>} The rules.
 */
function rulesWith(css, needle) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].includes(needle)) {
			out.push([m[1].trim(), m[2]])
		}
	}
	return out
}

describe('the list page breadcrumb trail', () => {
	it('draws its crumbs at the board crumb rule\'s 14px', () => {
		const crumb = rulesWith(read('look-board-detail.css'), '.cn-detail-page__header-row2 .cn-detail-page__breadcrumbs .vue-crumb .button-vue.button-vue')
		expect(crumb.some(([, body]) => /font-size:\s*14px/.test(body))).toBe(true)
	})

	it('has no index-page rule that sets the trail or its crumbs to another size', () => {
		const index = rulesWith(read('look-board-index.css'), 'cn-header-trail')
		for (const [selector, body] of index) {
			const size = body.match(/font-size:\s*([^;]+);/)
			if (size) {
				expect(`${selector}: ${size[1].trim()}`).toBe(`${selector}: 14px`)
			}
		}
	})
})

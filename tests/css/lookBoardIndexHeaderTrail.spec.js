/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list page's breadcrumb and note under the title read 15px on the boards
 * (DqAanMijToegewezen, DqZaaktypen, DqUwWachtrij), where the case page's row
 * stays 14px. jsdom draws no layout, so the rules are read as text.
 *
 * @spec openspec/changes/board-index-header-trail-15/specs/board-index-header-trail-15/spec.md#requirement-a-list-pages-breadcrumb-line-reads-15px
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector The rule's selector, as written.
 * @return {string|null} The rule's body.
 */
function body(selector) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const match = css.match(new RegExp(`${escaped} \\{([^}]*)\\}`))
	return match ? match[1] : null
}

describe('the list page breadcrumb line', () => {
	it('reads 15px', () => {
		expect(body('.cn-look-board .cn-index-page .cn-page-header .cn-header-trail.cn-detail-page__header-row2')).toContain('font-size: 15px;')
	})

	it('draws its crumbs at 15px over the detail row\'s 14px', () => {
		expect(body('.cn-look-board .cn-index-page .cn-header-trail.cn-detail-page__header-row2 .cn-detail-page__breadcrumbs .vue-crumb .button-vue.button-vue')).toContain('font-size: 15px;')
	})
})
